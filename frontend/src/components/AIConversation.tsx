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
    <div className="w-full rounded-3xl border border-clay/70 bg-white shadow-card overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <span className="eyebrow">Conversation</span>
      </div>
      <div className="max-h-[48vh] min-h-[180px] overflow-y-auto px-4 pb-4 pt-1 space-y-2.5">
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
  const ai = side === "left";
  return (
    <div className={`flex ${ai ? "justify-start" : "justify-end"} animate-fade-up`}>
      <div
        className={[
          "max-w-[82%] px-3.5 py-2 text-[14px] leading-snug shadow-soft",
          ai
            ? "bg-sand text-ink-800 rounded-2xl rounded-bl-md"
            : "bg-indigo-500 text-white rounded-2xl rounded-br-md",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start">
      <div className="bg-sand rounded-2xl rounded-bl-md px-3.5 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-soft-pulse"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
          />
        ))}
      </div>
    </div>
  );
}
