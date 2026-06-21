import { useCallback, useRef, useState } from "react";
import { api, DEMO_PATIENT_ID } from "../lib/api";
import { useChecklist } from "../hooks/useChecklist";
import { useDeepgram } from "../hooks/useDeepgram";
import LiveChecklist from "../components/LiveChecklist";
import AIConversation from "../components/AIConversation";
import VoiceRecorder from "../components/VoiceRecorder";
import type { ChatMessage } from "../components/AIConversation";
import type { MetricKey } from "../../../shared/types";

type Phase = "ready" | "recording" | "processing" | "followup" | "done";
type Mode = "voice" | "text";

const DOCTOR = "Dr. Miller";

// Follow-ups are asked ONE metric at a time, highest priority first. MetricKey
// order (pain → fatigue → swelling → stiffness → medication) is the priority
// order, and missingMetrics preserves it, so missing[0] is the top unanswered gap.
//
// Each metric has STAGED questions: a gentle presence question first, then a
// precise detail question if they confirm but don't give a specific value. The
// stage advances per re-ask of the same metric (see askStage below). A "no" to a
// presence question records the metric as absent server-side, so we move on.
const FOLLOWUP_STEPS: Record<MetricKey, string[]> = {
  pain: [
    "Have you had any joint pain today?",
    "On a scale of 0 to 10, what number best matches that pain?",
  ],
  fatigue: [
    "How have your energy levels been today: low, moderate, or high? Low means very fatigued.",
  ],
  swelling: [
    "Did you notice any joint swelling today?",
    "Would you say that swelling is mild or significant?",
  ],
  morningStiffness: [
    "Did you wake up with any stiffness this morning?",
    "About how many minutes did it last before it eased up?",
  ],
  medicationAdherence: [
    "Were you able to take your medication today?",
    "Did you take the full dose exactly as prescribed, yes or no?",
  ],
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
  // How many times we've asked about each metric, so staged follow-ups escalate
  // from the presence question to the precise detail question.
  const askCount = useRef<Partial<Record<MetricKey, number>>>({});
  // True once the check-in has been completed at least once, so later updates
  // (when symptoms change) get an "updated" confirmation rather than the first-time one.
  const completedOnce = useRef(false);

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
    askCount.current = {};
    completedOnce.current = false;
    setMessages([newGreeting()]);
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  // After a check-in is saved, let the patient add more if symptoms change.
  // Re-opens the input on the SAME check-in (free-form, not a reply to a
  // prior question) so the new info is merged into their existing record.
  const addUpdate = () => {
    setLastQuestion(null);
    addMsg("ai", "Of course. Tell me what has changed since your check-in.");
    setPhase("followup");
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
        addMsg(
          "ai",
          completedOnce.current
            ? "Got it. I've added that to your check-in for your doctor."
            : "Thanks, that's everything I need. Your check-in is saved.",
        );
        completedOnce.current = true;
        setPhase("done");
      } else {
        // Prefer a metric they touched on (ambiguous) over the top untouched gap.
        const target = missing.find((m) => ambiguous.includes(m)) ?? missing[0];
        // Escalate: stage = how many times we've already asked this metric,
        // clamped to the last (detail) question so it never overflows.
        const steps = FOLLOWUP_STEPS[target];
        const stage = Math.min(askCount.current[target] ?? 0, steps.length - 1);
        askCount.current[target] = (askCount.current[target] ?? 0) + 1;
        const q = steps[stage];
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
    <div className="min-h-[100dvh] flex justify-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md">
        <header className="flex flex-col items-center text-center mb-3">
          <img
            src="/interim-wordmark.png"
            alt="Interim"
            className="h-14 w-auto mb-2"
          />
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
              onAddMore={addUpdate}
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

        {/* Always-visible topic rail: pins to the top of the viewport so patients
            watch items check off live. The conversation below is the focal point. */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-2 bg-cream/85 backdrop-blur-sm">
          <div className="card px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow">Today&rsquo;s topics</span>
              <span className="text-[11px] font-medium text-ink-400">
                {state.confirmed.length}/{Object.keys(FOLLOWUP_STEPS).length} covered
              </span>
            </div>
            <LiveChecklist state={state} layout="rail" />
          </div>
        </div>

        <AIConversation
          messages={messages}
          typing={phase === "processing"}
          draft={phase === "recording" ? liveTranscript : ""}
        />
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
