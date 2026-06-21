interface Props {
  phase: "ready" | "recording" | "processing" | "followup" | "done";
  recording: boolean;
  onStart: () => void;
  onDone: () => void;
  onFollowupSpeak: () => void;
}

export default function VoiceRecorder({ phase, onStart, onDone, onFollowupSpeak }: Props) {
  return (
    <div className="w-full flex flex-col items-center mb-8">
      {phase === "ready" && <MicButton label="Tap to start your check-in" onClick={onStart} />}

      {phase === "recording" && (
        <div className="flex flex-col items-center">
          <button
            onClick={onDone}
            className="relative w-36 h-36 rounded-full bg-indigo-500 text-white grid place-items-center shadow-lift animate-ring-pulse"
            aria-label="Stop and review"
          >
            <Waveform />
          </button>
          <p className="mt-5 text-sm text-ink-400">Listening…</p>
          <button
            onClick={onDone}
            className="mt-2 px-8 py-3 rounded-full bg-ink-900 text-white font-medium shadow-soft active:scale-95 transition-transform"
          >
            Done
          </button>
        </div>
      )}

      {phase === "processing" && (
        <div className="flex flex-col items-center py-4">
          <span className="w-12 h-12 rounded-full border-[3px] border-clay border-t-indigo-500 animate-spin" />
          <p className="mt-5 text-ink-500">Reviewing your check-in…</p>
        </div>
      )}

      {phase === "followup" && <MicButton label="Tap to answer" onClick={onFollowupSpeak} />}

      {phase === "done" && (
        <div className="flex flex-col items-center py-4 animate-fade-up">
          <span className="w-16 h-16 rounded-full bg-indigo-500 text-white grid place-items-center text-3xl shadow-glow">
            ✓
          </span>
          <p className="mt-5 text-lg font-medium text-ink-900">Check-in saved</p>
          <p className="text-ink-500 text-sm">See you at your appointment.</p>
        </div>
      )}
    </div>
  );
}

function MicButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center">
      <span className="w-36 h-36 rounded-full bg-white border border-clay grid place-items-center shadow-soft transition-all duration-300 group-hover:shadow-lift group-hover:-translate-y-0.5 group-active:scale-95">
        <span className="w-24 h-24 rounded-full bg-indigo-500 grid place-items-center shadow-glow transition-transform duration-300 group-hover:scale-105">
          <MicIcon />
        </span>
      </span>
      <span className="mt-6 text-ink-500">{label}</span>
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function Waveform() {
  return (
    <span className="flex items-end gap-1 h-10">
      {[0.5, 0.9, 0.65, 1, 0.7, 0.45].map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-white/90 animate-soft-pulse"
          style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}
