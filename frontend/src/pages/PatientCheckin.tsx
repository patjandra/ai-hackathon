import { useCallback, useState } from "react";
import { api, DEMO_PATIENT_ID } from "../lib/api";
import { useChecklist } from "../hooks/useChecklist";
import { useDeepgram } from "../hooks/useDeepgram";
import LiveChecklist from "../components/LiveChecklist";
import AIConversation from "../components/AIConversation";
import VoiceRecorder from "../components/VoiceRecorder";
import InterimLogo from "../components/InterimLogo";
import type { ChatMessage } from "../components/AIConversation";
import type { MetricKey } from "../../../shared/types";

type Phase = "ready" | "recording" | "processing" | "followup" | "done";
type Mode = "voice" | "text";

const DOCTOR = "Dr. Miller";

// Follow-ups are asked ONE metric at a time, highest priority first. MetricKey
// order (pain → fatigue → swelling → stiffness → medication) is the priority
// order, and missingMetrics preserves it, so missing[0] is the top unanswered gap.
const FOLLOWUP_QUESTION: Record<MetricKey, string> = {
  pain: "On a scale of 0 to 10, how would you rate your pain today?",
  fatigue: "Would you say your energy has been low, moderate, or high? Low means very fatigued, high means not fatigued at all.",
  swelling: "Have you noticed any joint swelling today?",
  morningStiffness: "When you woke up, how long did the morning stiffness last?",
  medicationAdherence: "Have you been able to take your medication as prescribed?",
};

const GREETING = "Hi! Tell me how you've been feeling since your last visit.";
const newGreeting = (): ChatMessage => ({ id: "greeting", role: "ai", text: GREETING });

export default function PatientCheckin() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [mode, setMode] = useState<Mode>("voice");
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([newGreeting()]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [draftText, setDraftText] = useState("");
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  const addMsg = (role: ChatMessage["role"], text: string) =>
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text }]);

  const { state, scanInterim, applyConfirmed, clearOptimistic, reset } = useChecklist();

  const onInterim = useCallback(
    (t: string) => {
      setLiveTranscript(t);
      scanInterim(t);
    },
    [scanInterim],
  );

  const { recording, start, stop } = useDeepgram({ onInterim });

  // Brand-new check-in: clear everything, restart the thread.
  const beginFresh = async () => {
    reset();
    setMessages([newGreeting()]);
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  // Answering a follow-up: keep confirmed checkmarks AND the thread.
  const beginFollowup = async () => {
    clearOptimistic();
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  // Shared pipeline for both spoken and typed input.
  const submitTranscript = async (raw: string) => {
    const transcript = raw.trim();
    if (!transcript) {
      addMsg("ai", "I didn't catch that. Please try again.");
      setPhase("followup");
      return;
    }

    addMsg("patient", transcript);
    setPhase("processing");

    try {
      // Resolve the id locally — state updates are async.
      let id = checkinId;
      let covered: MetricKey[];
      let missing: MetricKey[];
      let ambiguous: MetricKey[];

      if (!id) {
        const r = await api.checkin(DEMO_PATIENT_ID, transcript);
        id = r.checkinId;
        setCheckinId(id);
        covered = r.coveredMetrics as MetricKey[];
        missing = r.missingMetrics as MetricKey[];
        ambiguous = (r.ambiguousMetrics ?? []) as MetricKey[];
      } else {
        // Pass the question we just asked so short replies ("yes", "6", "high")
        // are interpreted in context and attributed to the right metric.
        const r = await api.followup(id, transcript, lastQuestion ?? undefined);
        covered = r.coveredMetrics as MetricKey[];
        missing = r.missingMetrics as MetricKey[];
        ambiguous = (r.ambiguousMetrics ?? []) as MetricKey[];
      }

      applyConfirmed(covered, missing, ambiguous);

      if (missing.length === 0) {
        await api.complete(id);
        addMsg("ai", "Thanks, that's everything I need. Your check-in is saved.");
        setPhase("done");
      } else {
        const target = missing.find((m) => ambiguous.includes(m)) ?? missing[0];
        const q = FOLLOWUP_QUESTION[target];
        setLastQuestion(q); // remember for context on the next reply
        addMsg("ai", q);
        setPhase("followup");
      }
    } catch (err) {
      // Never strand the UI on the processing spinner — surface and let them retry.
      console.error("check-in analysis failed:", err);
      addMsg("ai", "Sorry, I had trouble processing that. Please try again in a moment.");
      setPhase("followup");
    }
  };

  // Voice: stop recording then run the shared pipeline.
  const done = async () => {
    const transcript = await stop();
    await submitTranscript(transcript);
  };

  // Text: send the typed message through the shared pipeline.
  const sendText = async () => {
    const text = draftText.trim();
    if (!text) return;
    setDraftText("");
    await submitTranscript(text);
  };

  const isInputPhase = phase === "ready" || phase === "followup";

  return (
    <div className="min-h-screen px-4 py-8 sm:py-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex flex-col items-center text-center mb-8">
          <InterimLogo className="mb-2" size="xl"/>
          <p className="text-sm text-ink-400">Check-in for {DOCTOR}</p>
        </header>

        {/* Input area: mic (voice) or composer (text); shared processing/done */}
        {mode === "text" && isInputPhase ? (
          <TextComposer
            value={draftText}
            onChange={setDraftText}
            onSend={sendText}
            onUseVoice={() => setMode("voice")}
            followup={phase === "followup"}
          />
        ) : (
          <div className="flex flex-col items-center">
            <VoiceRecorder
              phase={phase}
              recording={recording}
              onStart={beginFresh}
              onDone={done}
              onFollowupSpeak={beginFollowup}
            />
            {mode === "voice" && isInputPhase && (
              <button
                onClick={() => setMode("text")}
                className="-mt-2 mb-8 px-6 py-2.5 rounded-full border border-clay text-ink-600 text-sm font-medium hover:bg-sand/60 transition-colors"
              >
                Type Instead
              </button>
            )}
          </div>
        )}

        {/* Conversation below, with the Doctor's Checklist to its right */}
        <div className="grid grid-cols-[1fr_9.5rem] sm:grid-cols-[1fr_15rem] gap-3 sm:gap-5 items-start">
          <AIConversation
            messages={messages}
            typing={phase === "processing"}
            draft={phase === "recording" ? liveTranscript : ""}
          />
          <aside className="sticky top-6">
            <div className="card p-4">
              <h2 className="text-base font-semibold tracking-tight text-ink-900 leading-tight">
                Doctor&rsquo;s Checklist
              </h2>
              <p className="text-[12px] text-ink-400 leading-snug mb-3">
                Topics {DOCTOR} wants covered today
              </p>
              <LiveChecklist state={state} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TextComposer({
  value,
  onChange,
  onSend,
  onUseVoice,
  followup,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onUseVoice: () => void;
  followup: boolean;
}) {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-end gap-2 card p-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={2}
          autoFocus
          placeholder={followup ? "Type your answer…" : "Type how you've been feeling…"}
          className="flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className="shrink-0 px-5 py-2.5 rounded-full bg-indigo-500 text-white font-medium shadow-soft transition disabled:opacity-40 active:scale-95"
        >
          Send
        </button>
      </div>
      <button
        onClick={onUseVoice}
        className="mt-3 mx-auto block text-[13px] text-ink-400 hover:text-ink-700 transition-colors"
      >
        Use voice instead
      </button>
    </div>
  );
}
