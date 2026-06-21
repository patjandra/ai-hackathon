import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEMO_PATIENTS, type DemoPatient } from "../lib/patients";
import StatusBadge from "../components/StatusBadge";

function fmt(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function subtext(p: DemoPatient): string {
  if (p.status === "needs-review")
    return `${p.newCheckInsSinceInterim} new check-ins since last Interim`;
  if (p.status === "no-interim") return `${p.checkInCount} check-ins available`;
  if (p.status === "no-checkins") return "Awaiting patient updates";
  return `${p.checkInCount} check-ins`;
}

export default function DoctorDirectory() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const filtered = DEMO_PATIENTS.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.condition.toLowerCase().includes(q) ||
      fmt(p.dob).toLowerCase().includes(q)
    );
  }).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen px-5 py-8 lg:py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <p className="eyebrow mb-1">Doctor</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Patient Directory</h1>
          <p className="text-[13px] text-ink-500 mt-1">{DEMO_PATIENTS.length} patients</p>
        </div>

        {/* Search */}
        <div className="relative mb-6 animate-fade-up" style={{ animationDelay: "40ms" }}>
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients by name, DOB, or condition…"
            className="w-full pl-11 pr-4 py-3 border border-clay rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder:text-ink-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Patient list */}
        <div className="space-y-3">
          {filtered.map((patient, i) => (
            <button
              key={patient.id}
              onClick={() => navigate(`/doctor/${patient.id}`)}
              className="w-full text-left card px-5 py-4 hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] animate-fade-up"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Name + badge */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[15px] font-semibold text-ink-900">{patient.name}</span>
                    <StatusBadge status={patient.status} />
                  </div>
                  {/* DOB + condition */}
                  <p className="text-[13px] text-ink-500 mb-1.5">
                    DOB: {fmt(patient.dob)}
                    <span className="mx-1.5 text-clay">·</span>
                    {patient.condition}
                  </p>
                  {/* Subtext + next visit */}
                  <p className="text-[12px] text-ink-400">
                    {subtext(patient)}
                    <span className="mx-1.5 text-clay">·</span>
                    Next visit {fmt(patient.nextVisit)}
                  </p>
                </div>
                <svg className="w-4 h-4 text-ink-300 shrink-0 mt-1"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-ink-400">
              <p className="text-sm">No patients match "<span className="font-medium">{query}</span>"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
