interface Props {
  phase: "ready" | "recording" | "processing" | "followup" | "done";
  followUp: string | null;
}

// Displays the AI follow-up question bubble when metrics are missing.
export default function AIConversation({ phase, followUp }: Props) {
  if (phase !== "followup" || !followUp) return null;
  return (
    <div className="w-full">
      <div className="bg-sky-100 text-sky-900 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[90%]">
        {followUp}
      </div>
    </div>
  );
}
