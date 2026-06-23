import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useChecklist } from "../hooks/useChecklist";
import { useDeepgram } from "../hooks/useDeepgram";
import LiveChecklist from "../components/LiveChecklist";
import AIConversation from "../components/AIConversation";
import VoiceRecorder from "../components/VoiceRecorder";
import PatientTopBar from "../components/PatientTopBar";
import type { ChatMessage } from "../components/AIConversation";
import type { Patient } from "../../../shared/types";

type Phase = "ready" | "recording" | "processing" | "followup" | "done";
type Mode = "voice" | "text";

const DOCTOR = "Dr. Miller";

// Follow-ups are asked ONE metric at a time, highest priority first. MetricKey
// order (pain → fatigue → swelling → stiffness → medication) is the priority
// order, and missingMetrics preserves it, so missing[0] is the top unanswered gap.
//
// Each metric has STAGED questions: a gentle presence question first, then a
// precise detail question if they confirm but don't give a specific value. The
// stage advances per re-ask of the same metric (see askStage below). A "no" to a
// presence question records the metric as absent server-side, so we move on.
const FOLLOWUP_STEPS: Record<string, string[]> = {
  pain: [
    "Have you had any joint pain today?",
    "On a scale of 0 to 10, what number best matches that pain?",
  ],
  fatigue: [
    "How have your energy levels been today: low, moderate, or high? Low means very fatigued.",
  ],
  swelling: [
    "Did you notice any joint swelling today?",
    "Would you say that swelling is mild or significant?",
  ],
  "morning stiffness": [
    "Did you wake up with any stiffness this morning?",
    "About how many minutes did it last before it eased up?",
  ],
  "medication adherence": [
    "Were you able to take your medication today?",
    "Did you take the full dose exactly as prescribed, yes or no?",
  ],
};

const GREETING = "Hi! Tell me how you've been feeling since your last visit.";
const newGreeting = (): ChatMessage => ({ id: "greeting", role: "ai", text: GREETING });
const PATIENT_STORAGE_KEY = "interim.patient";

export default function PatientCheckin({ loginOnly = false }: { loginOnly?: boolean }) {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(() => {
    try {
      const saved = localStorage.getItem(PATIENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) as Patient : null;
    } catch {
      return null;
    }
  });
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("ready");
  const [mode, setMode] = useState<Mode>("voice");
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([newGreeting()]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [draftText, setDraftText] = useState("");
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  // How many times we've asked about each metric, so staged follow-ups escalate
  // from the presence question to the precise detail question.
  const askCount = useRef<Record<string, number>>({});
  // True once the check-in has been completed at least once, so later updates
  // (when symptoms change) get an "updated" confirmation rather than the first-time one.
  const completedOnce = useRef(false);

  const addMsg = (role: ChatMessage["role"], text: string) =>
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text }]);

  const { state, scanInterim, applyConfirmed, clearOptimistic, reset } = useChecklist(topics);

  const onInterim = useCallback(
    (t: string) => {
      setLiveTranscript(t);
      scanInterim(t);
    },
    [scanInterim],
  );

  const { recording, start, stop } = useDeepgram({ onInterim });

  useEffect(() => {
    if (!patient) {
      setTopics([]);
      setTopicsLoading(false);
      return;
    }

    const canRefresh = phase === "ready" || phase === "done";
    if (!canRefresh) return;

    let active = true;
    const loadTopics = (showLoading = false) => {
      if (showLoading) setTopicsLoading(true);
      api.getTrackedParams(patient.id)
        .then((result) => {
          if (active) setTopics(result.parameters);
        })
        .catch(() => {})
        .finally(() => {
          if (active && showLoading) setTopicsLoading(false);
        });
    };

    loadTopics(topics.length === 0);
    const refreshOnFocus = () => loadTopics();
    const interval = window.setInterval(() => loadTopics(), 3000);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [patient, phase]);

  // Brand-new check-in: clear everything, restart the thread.
  const beginFresh = async () => {
    reset();
    setCheckinId(null);
    askCount.current = {};
    completedOnce.current = false;
    setMessages([newGreeting()]);
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  // After a check-in is saved, let the patient add more if symptoms change.
  // Re-opens the input on the SAME check-in (free-form, not a reply to a
  // prior question) so the new info is merged into their existing record.
  const addUpdate = () => {
    setLastQuestion(null);
    addMsg("ai", "Of course. Tell me what has changed since your check-in.");
    setPhase("followup");
  };

  // Answering a follow-up: keep confirmed checkmarks AND the thread.
  const beginFollowup = async () => {
    clearOptimistic();
    setLiveTranscript("");
    await start();
    setPhase("recording");
  };

  // Shared pipeline for both spoken and typed input.
  const submitTranscript = async (raw: string) => {
    const transcript = raw.trim();
    if (!transcript) {
      addMsg("ai", "I didn't catch that. Please try again.");
      setPhase("followup");
      return;
    }

    addMsg("patient", transcript);
    setPhase("processing");

    try {
      // Resolve the id locally — state updates are async.
      let id = checkinId;
      let covered: string[];
      let missing: string[];
      let ambiguous: string[];

      if (!id) {
        if (!patient) throw new Error("No patient selected");
        const r = await api.checkin(patient.id, transcript);
        id = r.checkinId;
        setCheckinId(id);
        setTopics(r.requiredTopics);
        covered = r.coveredTopics;
        missing = r.missingTopics;
        ambiguous = r.ambiguousTopics;
      } else {
        // Pass the question we just asked so short replies ("yes", "6", "high")
        // are interpreted in context and attributed to the right metric.
        const r = await api.followup(id, transcript, lastQuestion ?? undefined);
        setTopics(r.requiredTopics);
        covered = r.coveredTopics;
        missing = r.missingTopics;
        ambiguous = r.ambiguousTopics;
      }

      applyConfirmed(covered, missing, ambiguous);

      if (missing.length === 0) {
        await api.complete(id);
        addMsg(
          "ai",
          completedOnce.current
            ? "Got it. I've added that to your check-in for your doctor."
            : "Thanks, that's everything I need. Your check-in is saved.",
        );
        completedOnce.current = true;
        setPhase("done");
      } else {
        // Prefer a metric they touched on (ambiguous) over the top untouched gap.
        const target = missing.find((m) => ambiguous.includes(m)) ?? missing[0];
        // Escalate: stage = how many times we've already asked this metric,
        // clamped to the last (detail) question so it never overflows.
        const normalizedTarget = target.toLocaleLowerCase("en-US");
        const steps = FOLLOWUP_STEPS[normalizedTarget] ?? [
          `How has your ${target.toLocaleLowerCase("en-US")} been since your last check-in?`,
        ];
        const stage = Math.min(askCount.current[normalizedTarget] ?? 0, steps.length - 1);
        askCount.current[normalizedTarget] = (askCount.current[normalizedTarget] ?? 0) + 1;
        const q = steps[stage];
        setLastQuestion(q); // remember for context on the next reply
        addMsg("ai", q);
        setPhase("followup");
      }
    } catch (err) {
      // Never strand the UI on the processing spinner — surface and let them retry.
      console.error("check-in analysis failed:", err);
      addMsg("ai", "Sorry, I had trouble processing that. Please try again in a moment.");
      setPhase("followup");
    }
  };

  // Voice: stop recording then run the shared pipeline.
  const done = async () => {
    const transcript = await stop();
    await submitTranscript(transcript);
  };

  // Text: send the typed message through the shared pipeline.
  const sendText = async () => {
    const text = draftText.trim();
    if (!text) return;
    setDraftText("");
    await submitTranscript(text);
  };

  const isInputPhase = phase === "ready" || phase === "followup";

  const handleLogin = (matched: Patient) => {
    localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(matched));
    setPatient(matched);
    navigate("/patient", { replace: true });
  };

  const logout = () => {
    localStorage.removeItem(PATIENT_STORAGE_KEY);
    setPatient(null);
    setTopics([]);
    setCheckinId(null);
    setMessages([newGreeting()]);
    setLiveTranscript("");
    setDraftText("");
    setLastQuestion(null);
    setPhase("ready");
    reset();
  };

  if (loginOnly) return <PatientLogin onLogin={handleLogin} />;
  if (!patient) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <PatientTopBar patient={patient} doctor={DOCTOR} onLogout={logout} />

      <div className="flex-1 flex justify-center px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md">
          <p className="text-center text-sm text-ink-600 font-medium mb-3">
            Welcome, {patient.name}
          </p>

          {/* Input area: mic (voice) or composer (text); shared processing/done */}
          {topicsLoading ? (
            <div className="flex justify-center py-10 text-sm text-ink-400">
              Loading today&rsquo;s topics…
            </div>
          ) : mode === "text" && isInputPhase ? (
            <TextComposer
              value={draftText}
              onChange={setDraftText}
              onSend={sendText}
              onUseVoice={() => setMode("voice")}
              followup={phase === "followup"}
            />
          ) : (
            <div className="flex flex-col items-center">
              <VoiceRecorder
                phase={phase}
                recording={recording}
                onStart={beginFresh}
                onDone={done}
                onFollowupSpeak={beginFollowup}
                onAddMore={addUpdate}
              />
              {mode === "voice" && isInputPhase && (
                <button
                  onClick={() => setMode("text")}
                  className="-mt-2 mb-8 px-6 py-2.5 rounded-full border border-clay text-ink-600 text-sm font-medium hover:bg-sand/60 transition-colors"
                >
                  Type Instead
                </button>
              )}
            </div>
          )}

          {/* Always-visible topic rail: pins just below the nav bar so patients
              watch items check off live. The conversation below is the focal point. */}
          <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 px-4 pt-1 pb-2 bg-cream/85 backdrop-blur-sm">
            <div className="card px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="eyebrow">Today&rsquo;s topics</span>
                <span className="text-[11px] font-medium text-ink-400">
                  {state.confirmed.length}/{topics.length} covered
                </span>
              </div>
              <LiveChecklist state={state} topics={topics} layout="rail" />
            </div>
          </div>

          <AIConversation
            messages={messages}
            typing={phase === "processing"}
            draft={phase === "recording" ? liveTranscript : ""}
          />
        </div>
      </div>
    </div>
  );
}

function PatientLogin({ onLogin }: { onLogin: (patient: Patient) => void }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isoDob = parseDisplayDate(dob);
    if (!isoDob) {
      setError("Enter a valid date of birth using MM/DD/YYYY.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      onLogin(await api.loginPatient(name, isoDob));
    } catch {
      setError("We couldn't find a patient with that name and date of birth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <header className="text-center mb-6">
          <img src="/interim-wordmark.png" alt="Interim" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-ink-900">Patient check-in</h1>
          <p className="text-sm text-ink-500 mt-1">Enter your information to continue.</p>
        </header>

        <form onSubmit={submit} className="card w-full min-w-0 overflow-hidden p-5 space-y-4">
          <label className="block min-w-0">
            <span className="text-[13px] font-medium text-ink-700">Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="e.g. Kelley Liang"
              className="patient-auth-input"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-[13px] font-medium text-ink-700">Date of birth</span>
            <input
              type="text"
              inputMode="numeric"
              value={dob}
              onChange={(e) => setDob(formatDisplayDate(e.target.value))}
              autoComplete="bday"
              placeholder="MM/DD/YYYY"
              maxLength={10}
              className="patient-auth-input"
            />
          </label>

          {error && (
            <p className="text-[13px] text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !dob}
            className="w-full py-3 rounded-full bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 transition-colors"
          >
            {loading ? "Finding your account…" : "Continue"}
          </button>
        </form>
        <p className="mt-4 text-center text-[12px] text-ink-400">
          Sample patient: Kelley Liang · DOB 01/14/1987
        </p>
      </div>
    </div>
  );
}

function formatDisplayDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDisplayDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, month, day, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T12:00:00`);
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) return null;
  return iso;
}

function TextComposer({
  value,
  onChange,
  onSend,
  onUseVoice,
  followup,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onUseVoice: () => void;
  followup: boolean;
}) {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-end gap-2 card p-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={2}
          autoFocus
          placeholder={followup ? "Type your answer…" : "Type how you've been feeling…"}
          className="flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className="shrink-0 px-5 py-2.5 rounded-full bg-indigo-500 text-white font-medium shadow-soft transition disabled:opacity-40 active:scale-95"
        >
          Send
        </button>
      </div>
      <button
        onClick={onUseVoice}
        className="mt-3 mx-auto block text-[13px] text-ink-400 hover:text-ink-700 transition-colors"
      >
        Use voice instead
      </button>
    </div>
  );
}
