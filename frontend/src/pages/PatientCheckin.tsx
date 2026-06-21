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
    const transcript = await stop();
    setPhase("processing");
    if (!checkinId) {
      const r = await api.checkin(DEMO_PATIENT_ID, transcript);
      setCheckinId(r.checkinId);
      applyConfirmed(r.coveredMetrics as MetricKey[], r.missingMetrics as MetricKey[]);
      finish(r.missingMetrics.length > 0, r.followUpQuestion);
    } else {
      const r = await api.followup(checkinId, transcript);
      applyConfirmed(r.coveredMetrics as MetricKey[], r.missingMetrics as MetricKey[]);
      finish(r.missingMetrics.length > 0, r.followUpQuestion);
    }
  };

  const finish = async (hasMissing: boolean, question: string | null) => {
    if (hasMissing && question) {
      setFollowUp(question);
      setPhase("followup");
    } else {
      if (checkinId) await api.complete(checkinId);
      setPhase("done");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 max-w-md mx-auto">
      <div className="w-full text-center mb-8">
        <p className="eyebrow mb-1">PreVisit check-in</p>
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
