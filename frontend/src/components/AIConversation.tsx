interface Props {
  phase: "ready" | "recording" | "processing" | "followup" | "done";
  followUp: string | null;
}

// AI follow-up question bubble, shown when metrics are missing.
export default function AIConversation({ phase, followUp }: Props) {
  if (phase !== "followup" || !followUp) return null;
  return (
    <div className="w-full flex gap-3 animate-fade-up">
      <span className="w-9 h-9 rounded-full bg-indigo-500 text-white grid place-items-center text-sm font-semibold shrink-0 shadow-soft">
        AI
      </span>
      <div className="bg-white border border-clay/70 text-ink-800 rounded-3xl rounded-tl-md px-4 py-3 shadow-soft leading-relaxed max-w-[85%]">
        {followUp}
      </div>
    </div>
  );
}
