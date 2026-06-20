import { useCallback, useState } from "react";
import { api, DEMO_PATIENT_ID } from "../lib/api";
import { useChecklist } from "../hooks/useChecklist";
import { useDeepgram } from "../hooks/useDeepgram";
import LiveChecklist from "../components/LiveChecklist";
import AIConversation from "../components/AIConversation";
import VoiceRecorder from "../components/VoiceRecorder";
import type { MetricKey } from "../../../shared/types";

type Phase = "ready" | "recording" | "processing" | "followup" | "done";

export default function PatientCheckin() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  const { state, scanInterim, applyConfirmed, reset } = useChecklist();

  const onInterim = useCallback(
    (t: string) => {
      setLiveTranscript(t);
      scanInterim(t);
    },
    [scanInterim],
  );

  const { recording, start, stop } = useDeepgram({ onInterim });

  const begin = async () => {
    reset();
    setFollowUp(null);
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  const done = async () => {
    const transcript = await stop();
    setPhase("processing");
    // Phase 2: single Claude call on the final transcript.
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-6 py-10 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">Your check-in</h1>

      <VoiceRecorder
        phase={phase}
        recording={recording}
        liveTranscript={liveTranscript}
        onStart={begin}
        onDone={done}
        onFollowupSpeak={begin}
      />

      <LiveChecklist state={state} />

      <AIConversation phase={phase} followUp={followUp} />
    </div>
  );
}
