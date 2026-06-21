import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDeepgram } from "../hooks/useDeepgram";
import { optimisticHighlight } from "../hooks/useChecklist";
import { LiveChecklist } from "../components/LiveChecklist";
import { api } from "../lib/api";

type InputMode = "voice" | "text";
type SessionState = "idle" | "recording" | "processing" | "done";

interface Message {
  role: "patient" | "ai";
  text: string;
}

const METRICS = [
  { key: "pain",                label: "Pain level"          },
  { key: "fatigue",             label: "Fatigue"             },
  { key: "swelling",            label: "Swelling"            },
  { key: "morning_stiffness",   label: "Morning stiffness"   },
  { key: "medication_adherence",label: "Medication adherence"},
];

const OPENING = "How have you been since your last visit? Share whatever's on your mind — pain levels, energy, medications, anything.";

export default function PatientCheckin() {
  const { patientId } = useParams<{ patientId: string }>();

  const [inputMode, setInputMode]     = useState<InputMode>("voice");
  const [session, setSession]         = useState<SessionState>("idle");
  const [messages, setMessages]       = useState<Message[]>([{ role: "ai", text: OPENING }]);
  const [optimistic, setOptimistic]   = useState<string[]>([]);
  const [confirmed, setConfirmed]     = useState<string[]>([]);
  const [missing, setMissing]         = useState<string[]>([]);
  const [checkinId, setCheckinId]     = useState<string | null>(null);
  const [typedText, setTypedText]     = useState("");
  const [liveText, setLiveText]       = useState("");
  const [error, setError]             = useState<string | null>(null);

  const accumulated = useRef("");
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep chat scrolled to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, session]);

  // ── Deepgram ──────────────────────────────────────────────────────────────
  const { start, stop } = useDeepgram((ev) => {
    if (ev.type === "interim") {
      setLiveText(ev.transcript);
      setOptimistic(optimisticHighlight(accumulated.current + " " + ev.transcript));
    } else {
      accumulated.current += " " + ev.transcript;
      setLiveText("");
    }
  });

  // ── Core submit (shared by voice + text) ─────────────────────────────────
  async function submit(transcript: string) {
    const text = transcript.trim();
    if (!text) return;

    setMessages(prev => [...prev, { role: "patient", text }]);
    setSession("processing");
    setError(null);

    try {
      let result: any;
      if (checkinId) {
        result = await api.submitFollowup(checkinId, text);
      } else {
        result = await api.submitCheckin(patientId!, text);
        setCheckinId(result.checkinId);
      }

      const newConfirmed = Array.from(new Set([...confirmed, ...(result.coveredMetrics ?? [])]));
      const newMissing   = (result.missingMetrics ?? []).filter((m: string) => !newConfirmed.includes(m));
      setConfirmed(newConfirmed);
      setMissing(newMissing);

      if (newMissing.length === 0) {
        const id = checkinId ?? result.checkinId;
        if (id) await api.completeCheckin(id);
        setMessages(prev => [...prev, {
          role: "ai",
          text: "That's everything — check-in saved. See you at your appointment.",
        }]);
        setSession("done");
      } else {
        if (result.followUpQuestion) {
          setMessages(prev => [...prev, { role: "ai", text: result.followUpQuestion }]);
        }
        setSession("idle");
        // Re-focus textarea in text mode
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    } catch (e: any) {
      setError(e.message);
      setSession("idle");
    }
  }

  // ── Voice handlers ────────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null);
    accumulated.current = "";
    setOptimistic([]);
    setLiveText("");
    try {
      setSession("recording");
      await start();
    } catch {
      setError("Microphone access denied. Try the Type option instead.");
      setSession("idle");
    }
  };

  const stopAndSend = async () => {
    stop();
    const text = accumulated.current;
    accumulated.current = "";
    setLiveText("");
    setOptimistic([]);
    await submit(text);
  };

  // ── Text handlers ─────────────────────────────────────────────────────────
  const sendText = async () => {
    const text = typedText;
    setTypedText("");
    setOptimistic([]);
    await submit(text);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (typedText.trim() && session === "idle") sendText();
    }
  };

  const switchMode = (m: InputMode) => {
    if (session === "recording") { stop(); setSession("idle"); }
    setInputMode(m);
  };

  const isDone       = session === "done";
  const isProcessing = session === "processing";
  const isRecording  = session === "recording";

  return (
    <div className="flex flex-col max-w-lg mx-auto" style={{ height: "calc(100dvh - 52px)" }}>

      {/* ── Compact checklist strip ─────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
        <LiveChecklist
          items={METRICS}
          optimistic={optimistic}
          confirmed={confirmed}
          missing={missing}
        />
      </div>

      {/* ── Chat area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "patient" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" ? (
              <p className="text-gray-800 text-base leading-relaxed max-w-[90%]">{msg.text}</p>
            ) : (
              <div className="max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-violet-600 text-white rounded-br-none">
                {msg.text}
              </div>
            )}
          </div>
        ))}

        {/* Live transcript preview while recording */}
        {isRecording && liveText && (
          <div className="flex justify-end">
            <div className="max-w-[82%] px-4 py-3 rounded-2xl rounded-br-none bg-violet-100 text-violet-600 text-sm italic">
              {liveText}…
            </div>
          </div>
        )}

        {/* Typing indicator while AI processes */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 items-center py-2">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce inline-block"
                  style={{ animationDelay: `${i * 0.18}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      {!isDone && (
        <div className="border-t border-gray-100 bg-white px-4 pt-2 pb-3 flex-shrink-0">

          {error && (
            <p className="text-red-500 text-xs mb-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Mode toggle — centered */}
          <div className="flex justify-center mb-2">
            <div className="flex gap-1 bg-gray-100 rounded-full p-1">
              {(["voice", "text"] as InputMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    inputMode === m
                      ? "bg-white shadow-sm text-violet-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {m === "voice" ? (
                    <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" /></svg>Voice</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Type</>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Voice input — centered large mic button */}
          {inputMode === "voice" && (
            isRecording ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1 items-end h-8 w-32">
                  {[0,1,2,3,4,5,6].map(i => (
                    <div key={i} className="flex-1 rounded-full bg-violet-500 animate-pulse"
                      style={{ height: `${30 + Math.sin(i) * 15}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <button
                  onClick={stopAndSend}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-2.5 rounded-full text-sm font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={startRecording}
                  disabled={isProcessing}
                  className="w-16 h-16 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
                >
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z"/>
                  </svg>
                </button>
              </div>
            )
          )}

          {/* Text input */}
          {inputMode === "text" && (
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={typedText}
                onChange={e => {
                  setTypedText(e.target.value);
                  setOptimistic(optimisticHighlight(e.target.value));
                }}
                onKeyDown={onKeyDown}
                rows={2}
                placeholder="Type here… (Enter to send)"
                disabled={isProcessing}
                className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
              />
              <button
                onClick={sendText}
                disabled={!typedText.trim() || isProcessing}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Done state footer */}
      {isDone && (
        <div className="border-t border-gray-100 px-4 py-4 text-center flex-shrink-0">
          <p className="text-xs text-gray-400">Your doctor will see this before your appointment.</p>
        </div>
      )}
    </div>
  );
}
