import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getPatient } from "../lib/patients";
import type { CheckIn, PhysicianSummary } from "../../../shared/types";
import StatusBadge from "../components/StatusBadge";
import DoctorTopBar from "../components/DoctorTopBar";
import TrackedParameters from "../components/TrackedParameters";
import WhyThisVisitMatters from "../components/WhyThisVisitMatters";
import SummaryCard from "../components/SummaryCard";
import MetricChart from "../components/MetricChart";
import KeyEvents from "../components/KeyEvents";
import PatientQuote from "../components/PatientQuote";

// ── helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-US",
    opts ?? { month: "short", day: "numeric", year: "numeric" });
}

function summaryToText(s: PhysicianSummary): string {
  const events = (s.keyEvents ?? [])
    .map((e) => `${fmtDate(e.date, { month: "short", day: "numeric" })} — ${e.description}`)
    .join("\n");
  return [
    "WHY THIS VISIT MATTERS",
    `Overall trajectory: ${s.whyThisVisitMatters.trajectory}`,
    "",
    (s.whyThisVisitMatters.focusAreas ?? []).map((a) => `• ${a}`).join("\n"),
    "",
    "SINCE LAST VISIT",
    s.assessment,
    "",
    "METRIC SUMMARY",
    `Pain: ${s.metricSummary.pain}`,
    `Fatigue: ${s.metricSummary.fatigue}`,
    `Adherence: ${s.metricSummary.adherence}`,
    `Morning Stiffness: ${s.metricSummary.morningStiffness}`,
    `Swelling: ${s.metricSummary.swelling}`,
    "",
    "KEY EVENTS",
    events,
    "",
    "PATIENT'S OWN WORDS",
    `"${s.patientQuote}"`,
    `— ${fmtDate(s.patientQuoteDate, { month: "long", day: "numeric" })}`,
  ].join("\n");
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// ── loading / error shells ─────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <DoctorTopBar />
      <div className="grid place-items-center px-6 py-24">{children}</div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export default function DoctorDashboard() {
  const { patientId = "" } = useParams();
  const navigate = useNavigate();
  const demo = getPatient(patientId);

  const [summary, setSummary]   = useState<PhysicianSummary | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [regen, setRegen]       = useState(false);

  // Edit-mode state (session-only — intentionally scoped down)
  const [editing, setEditing]     = useState(false);
  const [editText, setEditText]   = useState("");
  const [savedEdit, setSavedEdit] = useState<string | null>(null);

  const load = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = force ? `?force=1` : "";
      const [s, c] = await Promise.all([
        // Force-bust cache by appending query param (backend honours ?force=1)
        fetch(`/api/summary/${patientId}${url}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status + " " + r.statusText))))
          .catch(() => null),
        api.checkins(patientId).catch(() => [] as CheckIn[]),
      ]);
      setSummary(s);
      setCheckins(c);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [patientId]);

  const handleRegenerate = async () => {
    setRegen(true);
    setSavedEdit(null);
    // Delete cache on backend then re-fetch
    await fetch(`/api/summary/${patientId}`, { method: "DELETE" }).catch(() => {});
    await load(true);
    setRegen(false);
  };

  const handleEditOpen = () => {
    setEditText(savedEdit ?? (summary ? summaryToText(summary) : ""));
    setEditing(true);
  };

  const handleEditSave = () => {
    setSavedEdit(editText);
    setEditing(false);
  };

  // Real "Needs Review" comparison: latest check-in is newer than the Interim
  const latestCheckin = checkins.length ? checkins[checkins.length - 1] : null;
  const needsReview = !!summary && !!latestCheckin &&
    new Date(latestCheckin.date) > new Date(summary.generatedAt);

  // Determine interim status
  const interimStatus = !checkins.length
    ? "no-checkins"
    : !summary
      ? "no-interim"
      : needsReview
        ? "needs-review"
        : "ready";

  // Patient name/DOB/condition come from the demo directory (fallback to API patient name)
  const patientName      = demo?.name ?? patientId;
  const patientDob       = demo?.dob ?? null;
  const patientCondition = demo?.condition ?? summary?.patientId ?? "";
  const patientNextVisit = demo?.nextVisit ?? null;

  if (loading && !summary) {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-ink-500">
          <span className="w-5 h-5 rounded-full border-2 border-clay border-t-indigo-500 animate-spin" />
          Preparing briefing…
        </div>
      </Shell>
    );
  }

  if (error && !summary && !checkins.length) {
    return (
      <Shell>
        <div className="card px-6 py-5 text-rose-600 text-sm">Failed to load: {error}</div>
      </Shell>
    );
  }

  const initials = patientName.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="min-h-screen">
      <DoctorTopBar />
      <main className="px-5 py-8 lg:py-10">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Back link ── */}
        <button
          onClick={() => navigate("/doctor")}
          className="flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-700 transition-colors -mb-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Patient directory
        </button>

        {/* ── Patient header ── */}
        <header className="card px-5 py-4 animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-indigo-500 text-white grid place-items-center text-sm font-medium shadow-soft shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <h1 className="text-lg font-semibold tracking-tight text-ink-900">{patientName}</h1>
                  <StatusBadge status={interimStatus} />
                </div>
                <p className="text-[13px] text-ink-500 leading-snug">
                  {patientDob && <>DOB: {fmtDate(patientDob)}<span className="mx-1.5 text-clay">·</span></>}
                  {patientCondition}
                  {patientNextVisit && <><span className="mx-1.5 text-clay">·</span>Next visit {fmtDate(patientNextVisit)}</>}
                </p>
                {summary && (
                  <p className="text-[12px] text-ink-400 mt-0.5">
                    {summary.checkInCount} check-ins
                    {summary.dateRange && <> · {fmtDate(summary.dateRange.from, { month: "short", day: "numeric" })} – {fmtDate(summary.dateRange.to, { month: "short", day: "numeric" })}</>}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {(summary || checkins.length > 0) && (
              <div className="flex gap-2 shrink-0">
                {summary && !editing && (
                  <button
                    onClick={handleEditOpen}
                    className="px-3 py-1.5 rounded-xl border border-clay text-[12px] font-medium text-ink-600 hover:bg-sand transition-colors"
                  >
                    Edit Interim
                  </button>
                )}
                <button
                  onClick={handleRegenerate}
                  disabled={regen}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-[12px] font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {regen && <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                  {regen ? "Regenerating…" : "Regenerate Interim"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── Needs Review banner ── */}
        {needsReview && !editing && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] animate-fade-up">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span>
              New check-ins were submitted after this Interim was generated.
              <button onClick={handleRegenerate} className="ml-1.5 font-semibold underline underline-offset-2 hover:no-underline">
                Regenerate
              </button>{" "}
              to include the latest updates.
            </span>
          </div>
        )}

        {/* ── Edit mode ── */}
        {editing && (
          <section className="card p-5 animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="eyebrow">Edit Interim</h2>
              <button onClick={() => setEditing(false)} className="text-[12px] text-ink-400 hover:text-ink-700">Cancel</button>
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={28}
              className="w-full border border-clay rounded-2xl px-4 py-3 text-sm font-mono text-ink-800 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl border border-clay text-[13px] text-ink-600 hover:bg-sand transition-colors">
                Cancel
              </button>
              <button onClick={handleEditSave} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-[13px] font-medium hover:bg-indigo-600 transition-colors">
                Save edits
              </button>
            </div>
          </section>
        )}

        {/* ── Saved edit display ── */}
        {!editing && savedEdit && (
          <section className="card p-5 animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="eyebrow">Interim <span className="text-amber-500 ml-1">· Edited</span></h2>
              <div className="flex gap-2">
                <button onClick={handleEditOpen} className="text-[12px] text-ink-400 hover:text-ink-700">Edit again</button>
                <span className="text-clay">·</span>
                <button onClick={() => setSavedEdit(null)} className="text-[12px] text-rose-400 hover:text-rose-600">Reset to AI version</button>
              </div>
            </div>
            <pre className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap font-sans">{savedEdit}</pre>
          </section>
        )}

        {/* ── Interim header (only when showing AI structured version) ── */}
        {!editing && !savedEdit && summary && (
          <div className="px-1 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <p className="eyebrow">Interim</p>
            <p className="text-[12px] text-ink-400 mt-0.5">
              Generated from {summary.checkInCount} check-ins
              {summary.dateRange && <> between {fmtDate(summary.dateRange.from, { month: "short", day: "numeric" })} and {fmtDate(summary.dateRange.to, { month: "short", day: "numeric" })}</>}
              <span className="mx-1.5 text-clay">·</span>
              Last updated: {fmtTime(summary.generatedAt)}
            </p>
          </div>
        )}

        {/* ── CASE: No check-ins ── */}
        {!loading && checkins.length === 0 && (
          <section className="card p-8 text-center animate-fade-up">
            <div className="w-12 h-12 rounded-full bg-sand grid place-items-center mx-auto mb-4">
              <svg className="w-6 h-6 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-ink-900 mb-2">No check-ins yet</h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto leading-relaxed">
              This patient has not submitted enough updates to generate an Interim.
              Once the patient completes check-ins, an Interim can be generated before the visit.
            </p>
          </section>
        )}

        {/* ── CASE: Check-ins but no Interim ── */}
        {!loading && checkins.length > 0 && !summary && !editing && (
          <section className="card p-8 text-center animate-fade-up">
            <div className="w-12 h-12 rounded-full bg-indigo-50 grid place-items-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-ink-900 mb-2">No Interim generated yet</h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto leading-relaxed mb-5">
              This patient has {checkins.length} check-in{checkins.length !== 1 ? "s" : ""} available.
              Generate an Interim to create a physician-ready briefing before the next visit.
            </p>
            <button
              onClick={handleRegenerate}
              disabled={regen}
              className="px-6 py-2.5 rounded-full bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {regen && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {regen ? "Generating…" : "Generate Interim"}
            </button>
          </section>
        )}

        {/* ── CASE: Interim exists (AI structured view) ── */}
        {!editing && !savedEdit && summary && (
          <>
            <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
              <WhyThisVisitMatters data={summary.whyThisVisitMatters} />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
              <SummaryCard summary={summary} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
                <MetricChart checkins={checkins} />
              </div>
              <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
                <KeyEvents events={summary.keyEvents} />
              </div>
            </div>
            {summary.patientQuote && (
              <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
                <PatientQuote quote={summary.patientQuote} date={summary.patientQuoteDate} />
              </div>
            )}
          </>
        )}

        {/* ── Tracked parameters (always shown) ── */}
        <div className="animate-fade-up" style={{ animationDelay: "280ms" }}>
          <TrackedParameters patientId={patientId} />
        </div>

      </div>
      </main>
    </div>
  );
}
