import { useCallback, useState } from "react";
import { api, DEMO_PATIENT_ID } from "../lib/api";
import { useChecklist } from "../hooks/useChecklist";
import { useDeepgram } from "../hooks/useDeepgram";
import LiveChecklist from "../components/LiveChecklist";
import AIConversation from "../components/AIConversation";
import VoiceRecorder from "../components/VoiceRecorder";
import type { MetricKey } from "../../../shared/types";

type Phase = "ready" | "recording" | "processing" | "followup" | "done";

const HEADINGS: Record<Phase, string> = {
  ready: "How have you been?",
  recording: "I'm listening…",
  processing: "One moment…",
  followup: "Just one more thing",
  done: "All done",
};

// Follow-ups are asked ONE metric at a time, highest priority first. MetricKey
// order (pain → fatigue → swelling → stiffness → medication) is the priority
// order, and missingMetrics preserves it, so missing[0] is the top unanswered gap.
const FOLLOWUP_QUESTION: Record<MetricKey, string> = {
  pain: "On a scale of 0 to 10, how would you rate your pain today?",
  fatigue: "How have your energy levels been, would you say low, moderate, or high fatigue?",
  swelling: "Have you noticed any joint swelling today?",
  morningStiffness: "When you woke up, how long did the morning stiffness last?",
  medicationAdherence: "Have you been able to take your medication as prescribed?",
};

export default function PatientCheckin() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  const { state, scanInterim, applyConfirmed, clearOptimistic, reset } = useChecklist();

  const onInterim = useCallback(
    (t: string) => {
      setLiveTranscript(t);
      scanInterim(t);
    },
    [scanInterim],
  );

  const { recording, start, stop } = useDeepgram({ onInterim });

  // Brand-new check-in: clear everything.
  const beginFresh = async () => {
    reset();
    setFollowUp(null);
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  // Answering a follow-up: keep confirmed checkmarks, only clear live highlights.
  const beginFollowup = async () => {
    clearOptimistic();
    setFollowUp(null);
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  const done = async () => {
    const transcript = (await stop()).trim();

    // Nothing captured → don't create a check-in or complete anything. Re-prompt.
    if (!transcript) {
      setFollowUp("I didn't catch that. Please try again.");
      setPhase("followup");
      return;
    }

    setPhase("processing");

    // Resolve the id locally — state updates are async, so we can't rely on
    // `checkinId` being set within this same call after api.checkin.
    let id = checkinId;
    let covered: MetricKey[];
    let missing: MetricKey[];

    if (!id) {
      const r = await api.checkin(DEMO_PATIENT_ID, transcript);
      id = r.checkinId;
      setCheckinId(id);
      covered = r.coveredMetrics as MetricKey[];
      missing = r.missingMetrics as MetricKey[];
    } else {
      const r = await api.followup(id, transcript);
      covered = r.coveredMetrics as MetricKey[];
      missing = r.missingMetrics as MetricKey[];
    }

    applyConfirmed(covered, missing);

    // Complete ONLY when every metric is covered. Otherwise ask just the single
    // highest-priority missing metric; the next one comes after they answer.
    if (missing.length === 0) {
      await api.complete(id);
      setPhase("done");
    } else {
      setFollowUp(FOLLOWUP_QUESTION[missing[0]]);
      setPhase("followup");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 max-w-md mx-auto">
      <div className="w-full text-center mb-8">
        <p className="eyebrow mb-1">Interim check-in</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900 transition-all duration-300">{HEADINGS[phase]}</h1>
      </div>

      <VoiceRecorder
        phase={phase}
        recording={recording}
        liveTranscript={liveTranscript}
        onStart={beginFresh}
        onDone={done}
        onFollowupSpeak={beginFollowup}
      />

      <LiveChecklist state={state} />

      <AIConversation phase={phase} followUp={followUp} />
    </div>
  );
}
