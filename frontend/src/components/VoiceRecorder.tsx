interface Props {
  phase: "ready" | "recording" | "processing" | "followup" | "done";
  recording: boolean;
  liveTranscript: string;
  onStart: () => void;
  onDone: () => void;
  onFollowupSpeak: () => void;
}

export default function VoiceRecorder({ phase, liveTranscript, onStart, onDone, onFollowupSpeak }: Props) {
  return (
    <div className="w-full flex flex-col items-center mb-8">
      {phase === "ready" && (
        <>
          <MicButton label="Tap to start your check-in" onClick={onStart} />
        </>
      )}

      {phase === "recording" && (
        <>
          <button
            onClick={onDone}
            className="w-32 h-32 rounded-full bg-rose-500 text-white text-lg font-medium shadow-lg animate-pulse"
          >
            ● Live
          </button>
          <p className="mt-4 text-sm text-slate-500 min-h-[2.5rem] text-center">
            {liveTranscript || "Listening…"}
          </p>
          <button onClick={onDone} className="mt-2 px-6 py-2 rounded-full bg-slate-800 text-white">
            Done
          </button>
        </>
      )}

      {phase === "processing" && (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Reviewing your check-in…</p>
        </div>
      )}

      {phase === "followup" && <MicButton label="Tap to answer" onClick={onFollowupSpeak} />}

      {phase === "done" && (
        <p className="text-lg font-medium text-emerald-600">Check-in saved. See you at your appointment.</p>
      )}
    </div>
  );
}

function MicButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center">
      <span className="w-32 h-32 rounded-full bg-sky-600 text-white text-4xl flex items-center justify-center shadow-lg">
        🎙
      </span>
      <span className="mt-4 text-slate-600">{label}</span>
    </button>
  );
}
