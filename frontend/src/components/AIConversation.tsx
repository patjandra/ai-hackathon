import { useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "ai" | "patient";
  text: string;
}

interface Props {
  messages: ChatMessage[];
  typing?: boolean; // AI is processing the last utterance
  draft?: string; // live interim transcript while the patient is speaking
}

// iMessage-style thread: AI questions on the left, patient's spoken replies on
// the right. Scrolls within a fixed height and sticks to the newest message.
export default function AIConversation({ messages, typing, draft }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const liveDraft = draft?.trim() ?? "";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typing, liveDraft]);

  if (messages.length === 0 && !typing && !liveDraft) return null;

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col rounded-3xl border border-clay/70 bg-white shadow-card overflow-hidden">
      <div className="px-4 pt-3 pb-1 shrink-0">
        <span className="eyebrow">Conversation</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-1 space-y-2.5">
        {messages.map((m) =>
          m.role === "ai" ? (
            <Bubble key={m.id} side="left">{m.text}</Bubble>
          ) : (
            <Bubble key={m.id} side="right">{m.text}</Bubble>
          ),
        )}
        {liveDraft && (
          <div className="flex justify-end">
            <div className="max-w-[82%] px-3.5 py-2 text-[14px] leading-snug rounded-2xl rounded-br-md bg-indigo-500/60 text-white italic">
              {liveDraft}
            </div>
          </div>
        )}
        {typing && <Typing />}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  if (side === "left") {
    return (
      <div className="flex justify-start items-start gap-2 animate-fade-up">
        <AiAvatar />
        <div className="max-w-[80%] px-4 py-3 text-[15px] leading-relaxed bg-indigo-50 text-ink-900 rounded-2xl rounded-tl-md">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end animate-fade-up">
      <div className="max-w-[82%] px-3.5 py-2 text-[14px] leading-snug shadow-soft bg-indigo-500 text-white rounded-2xl rounded-br-md">
        {children}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start items-start gap-2">
      <AiAvatar />
      <div className="bg-indigo-50 rounded-2xl rounded-tl-md px-4 py-3.5 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-typing-bounce"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// Lavender avatar with a sparkle mark, shown beside every AI message.
function AiAvatar() {
  return (
    <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 grid place-items-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5l1.7 4.6 4.6 1.7-4.6 1.7L12 15.1l-1.7-4.6L5.7 8.8l4.6-1.7L12 2.5z" />
        <path d="M18.5 14l.95 2.55L22 17.5l-2.55.95L18.5 21l-.95-2.55L15 17.5l2.55-.95L18.5 14z" />
      </svg>
    </span>
  );
}
