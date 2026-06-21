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

const HEADINGS: Record<Phase, string> = {
  ready: "How have you been?",
  recording: "I'm listening…",
  processing: "One moment…",
  followup: "Quick follow up…",
  done: "All done",
};

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
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([newGreeting()]);
  const [liveTranscript, setLiveTranscript] = useState("");

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

  // Answering a follow-up: keep confirmed checkmarks AND the thread; only clear
  // the live transient highlights.
  const beginFollowup = async () => {
    clearOptimistic();
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  const done = async () => {
    const transcript = (await stop()).trim();

    // Nothing captured → don't create a check-in or complete anything. Re-prompt.
    if (!transcript) {
      addMsg("ai", "I didn't catch that. Please try again.");
      setPhase("followup");
      return;
    }

    // Show what the patient said as their own message, then let the AI "think".
    addMsg("patient", transcript);
    setPhase("processing");

    // Resolve the id locally — state updates are async, so we can't rely on
    // `checkinId` being set within this same call after api.checkin.
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
      const r = await api.followup(id, transcript);
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
      // Prefer a metric the patient just touched on but left unclear (the topic
      // in discussion); otherwise fall back to the highest-priority missing one.
      // `missing` is already priority-ordered, so .find keeps priority among ties.
      const target = missing.find((m) => ambiguous.includes(m)) ?? missing[0];
      addMsg("ai", FOLLOWUP_QUESTION[target]);
      setPhase("followup");
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:py-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex flex-col items-center text-center mb-6">
          <InterimLogo className="mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink-900 transition-all duration-300">
            {HEADINGS[phase]}
          </h1>
        </header>

        {/* Mic — top, centered (as before) */}
        <VoiceRecorder
          phase={phase}
          recording={recording}
          onStart={beginFresh}
          onDone={done}
          onFollowupSpeak={beginFollowup}
        />

        {/* Conversation below, with the live criteria to its right */}
        <div className="grid grid-cols-[1fr_8rem] sm:grid-cols-[1fr_12rem] gap-3 sm:gap-5 items-start">
          <AIConversation
            messages={messages}
            typing={phase === "processing"}
            draft={phase === "recording" ? liveTranscript : ""}
          />
          <aside className="sticky top-6">
            <div className="card p-3 sm:p-4">
              <h2 className="eyebrow mb-3 px-1">Criteria</h2>
              <LiveChecklist state={state} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
