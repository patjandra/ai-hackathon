import { useNavigate, useSearchParams } from "react-router-dom";
import { DEMO_PATIENTS, type DemoPatient } from "../lib/patients";
import StatusBadge from "../components/StatusBadge";
import DoctorTopBar from "../components/DoctorTopBar";

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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const setQuery = (v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set("q", v);
    else next.delete("q");
    setParams(next, { replace: true });
  };

  const filtered = DEMO_PATIENTS.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.condition.toLowerCase().includes(q) ||
      fmt(p.dob).toLowerCase().includes(q)
    );
  }).sort((a, b) => a.name.localeCompare(b.name));

  const counts = {
    review: DEMO_PATIENTS.filter((p) => p.status === "needs-review").length,
    total: DEMO_PATIENTS.length,
  };

  return (
    <div className="min-h-screen">
      <DoctorTopBar value={query} onChange={setQuery} />
      <main className="px-5 py-8 lg:py-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6 animate-fade-up">
          <div>
            <p className="eyebrow mb-1">Doctor</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Patient Directory</h1>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            {counts.review > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {counts.review} need review
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-sand text-ink-500 font-medium">
              {counts.total} patients
            </span>
          </div>
        </div>

        {query && (
          <p className="text-[12px] text-ink-400 mb-3 animate-fade-up">
            Showing results for “<span className="font-medium text-ink-600">{query}</span>” ·{" "}
            <button onClick={() => setQuery("")} className="underline underline-offset-2 hover:text-ink-700">
              clear
            </button>
          </p>
        )}

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
      </main>
    </div>
  );
}
