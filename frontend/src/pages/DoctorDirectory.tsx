import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEMO_PATIENTS, type DemoPatient, type InterimStatus } from "../lib/patients";
import { api } from "../lib/api";
import type { Patient } from "../../../shared/types";
import DoctorTopBar from "../components/DoctorTopBar";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDOB(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtVisit(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function subtext(p: DemoPatient): string {
  if (p.status === "needs-review") return `${p.newCheckInsSinceInterim} new check-ins since last Interim`;
  if (p.status === "no-interim")   return `${p.checkInCount} check-ins available`;
  if (p.status === "no-checkins")  return "Awaiting patient updates";
  return `${p.checkInCount} check-ins`;
}

// ── status dot + label ────────────────────────────────────────────────────────

const STATUS_CFG: Record<InterimStatus, { dot: string; text: string; label: string }> = {
  "ready":        { dot: "bg-green-500",  text: "text-green-700",  label: "Interim Ready" },
  "needs-review": { dot: "bg-amber-500",  text: "text-amber-700",  label: "Needs Review"  },
  "no-interim":   { dot: "bg-indigo-400", text: "text-indigo-700", label: "No Interim"    },
  "no-checkins":  { dot: "bg-slate-400",  text: "text-slate-500",  label: "No Check-ins"  },
};

function StatusDot({ status }: { status: InterimStatus }) {
  const { dot, text, label } = STATUS_CFG[status];
  return (
    <span className={`flex items-center gap-1.5 text-[13px] font-medium ${text}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

// ── filter pills ──────────────────────────────────────────────────────────────

type FilterKey = "all" | "flagged" | "needs-review" | "ready" | "no-interim";
const PILLS: { key: FilterKey; label: string }[] = [
  { key: "all",          label: "All"          },
  { key: "flagged",      label: "Flagged"       },
  { key: "needs-review", label: "Needs Review"  },
  { key: "ready",        label: "Interim Ready" },
  { key: "no-interim",   label: "No Interim"    },
];

function matchesFilter(p: DemoPatient, f: FilterKey): boolean {
  if (f === "all")     return true;
  if (f === "flagged") return !!p.alertFlagged;
  return p.status === f;
}

// ── sort ──────────────────────────────────────────────────────────────────────

type SortKey = "next-visit" | "name" | "dob" | "status";

const STATUS_RANK: Record<InterimStatus, number> = {
  "needs-review": 0, "no-interim": 1, "ready": 2, "no-checkins": 3,
};

function sortPatients(list: DemoPatient[], by: SortKey): DemoPatient[] {
  return [...list].sort((a, b) => {
    if (by === "name")   return a.name.localeCompare(b.name);
    if (by === "dob")    return a.dob.localeCompare(b.dob);
    if (by === "status") return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    return new Date(a.nextVisit).getTime() - new Date(b.nextVisit).getTime();
  });
}

const SORT_LABELS: Record<SortKey, string> = {
  "next-visit": "Next visit",
  "name":       "Name A–Z",
  "dob":        "DOB",
  "status":     "Status",
};

function directoryPatient(patient: Patient): DemoPatient {
  return {
    id: patient.id,
    name: patient.name,
    dob: patient.dob,
    condition: patient.diagnosis,
    nextVisit: patient.nextAppointment,
    checkInCount: 0,
    lastCheckIn: null,
    interimGeneratedAt: null,
    status: "no-checkins",
  };
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function DoctorDirectory() {
  const navigate = useNavigate();
  const [query,        setQuery]   = useState("");
  const [activeFilter, setFilter]  = useState<FilterKey>("all");
  const [sortBy,       setSortBy]  = useState<SortKey>("next-visit");
  const [page,         setPage]    = useState(1);
  const [patients, setPatients] = useState<DemoPatient[]>(DEMO_PATIENTS);
  const [creating, setCreating] = useState(false);
  const PAGE_SIZE = 25;

  useEffect(() => {
    api.listPatients()
      .then((stored) => {
        setPatients((current) => {
          const byId = new Map(current.map((patient) => [patient.id, patient]));
          for (const patient of stored) {
            if (!byId.has(patient.id)) byId.set(patient.id, directoryPatient(patient));
          }
          return Array.from(byId.values());
        });
      })
      .catch(() => {});
  }, []);

  const total   = patients.length;
  const flagged = patients.filter(p => p.alertFlagged).length;

  const filtered = sortPatients(
    patients.filter(p => {
      const q = query.toLowerCase();
      const matchQ = !q || p.name.toLowerCase().includes(q) ||
        p.condition.toLowerCase().includes(q) || fmtDOB(p.dob).toLowerCase().includes(q);
      return matchQ && matchesFilter(p, activeFilter);
    }),
    sortBy,
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  // Reset to page 1 whenever filter/search/sort changes would leave page out of range
  const safePage = Math.min(page, Math.max(1, totalPages));
  const visible  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goTo = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Reset page on filter/search changes
  const handleQuery  = (v: string)      => { setQuery(v);  setPage(1); };
  const handleFilter = (v: FilterKey)   => { setFilter(v); setPage(1); };
  const handleSort   = (v: SortKey)     => { setSortBy(v); setPage(1); };

  return (
    <div className="min-h-screen">
      <DoctorTopBar />
      <main className="px-5 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-7 animate-fade-up">
          <div>
            <p className="eyebrow mb-1">Welcome, Dr. Miller, M.D.</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Patient Directory</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-[13px]">
              <span className="text-ink-500 font-medium">{total} patients</span>
              {flagged > 0 && (
                <span className="text-rose-600 font-semibold ml-2">{flagged} flagged</span>
              )}
            </div>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 text-white text-[13px] font-medium hover:bg-indigo-600 shadow-sm transition-colors"
            >
              <span className="text-base leading-none">+</span>
              New patient
            </button>
          </div>
        </div>

        {/* ── Search + Sort ── */}
        <div className="flex gap-3 mb-4 animate-fade-up" style={{ animationDelay: "40ms" }}>
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={query}
              onChange={e => handleQuery(e.target.value)}
              placeholder="Search by name, DOB, or condition…"
              className="w-full pl-10 pr-4 py-2.5 border border-clay rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder:text-ink-400"
            />
          </div>

          {/* Sort select */}
          <div className="flex items-center gap-2 px-4 py-2.5 border border-clay rounded-2xl bg-white text-sm text-ink-600 whitespace-nowrap">
            <svg className="w-3.5 h-3.5 text-ink-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            <span className="text-ink-400">Sort:</span>
            <select
              value={sortBy}
              onChange={e => handleSort(e.target.value as SortKey)}
              className="bg-transparent text-ink-700 font-medium focus:outline-none cursor-pointer"
            >
              {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Filter pills ── */}
        <div className="flex gap-2 mb-5 flex-wrap animate-fade-up" style={{ animationDelay: "60ms" }}>
          {PILLS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleFilter(key)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                activeFilter === key
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "border border-clay text-ink-600 hover:bg-sand"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-3xl border border-clay shadow-soft overflow-hidden animate-fade-up" style={{ animationDelay: "80ms" }}>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_160px_140px_28px] px-5 py-2.5 border-b border-clay bg-sand/60">
            <span className="eyebrow">Patient</span>
            <span className="eyebrow">Status</span>
            <span className="eyebrow">Next Visit</span>
            <span />
          </div>

          {/* Rows */}
          {visible.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-400">
              No patients match your search or filter.
            </div>
          ) : (
            <div className="divide-y divide-clay/60">
              {visible.map(p => {
                const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2);
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/doctor/${p.id}`)}
                    className={`w-full text-left grid grid-cols-[1fr_160px_140px_28px] items-center px-5 py-4 hover:bg-sand/50 transition-colors relative ${
                      p.alertFlagged ? "border-l-[3px] border-l-rose-400 pl-[17px]" : ""
                    }`}
                  >
                    {/* Patient cell */}
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white grid place-items-center text-[13px] font-semibold shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-semibold text-ink-900 truncate">{p.name}</span>
                          {p.alertFlagged && (
                            <span className="text-rose-500 text-[13px] shrink-0" title={p.alertReason}>⚠</span>
                          )}
                        </div>
                        <p className="text-[12px] text-ink-400 truncate">
                          DOB {fmtDOB(p.dob)} · {p.condition} · {subtext(p)}
                        </p>
                      </div>
                    </div>

                    {/* Status cell */}
                    <div>
                      <StatusDot status={p.status} />
                    </div>

                    {/* Next visit cell */}
                    <div className="text-[13px] text-ink-700 font-medium">
                      {fmtVisit(p.nextVisit)}
                    </div>

                    {/* Chevron */}
                    <svg className="w-4 h-4 text-ink-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-[12px] text-ink-400">
              {filtered.length < total
                ? `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length} patients`
                : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, total)} of ${total} patients`}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goTo(safePage - 1)}
                  disabled={safePage === 1}
                  className="w-8 h-8 rounded-xl border border-clay flex items-center justify-center text-ink-500 hover:bg-sand disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    className={`w-8 h-8 rounded-xl text-[13px] font-medium transition-colors ${
                      p === safePage
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "border border-clay text-ink-600 hover:bg-sand"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => goTo(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="w-8 h-8 rounded-xl border border-clay flex items-center justify-center text-ink-500 hover:bg-sand disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
      </main>
      {creating && (
        <NewPatientModal
          onClose={() => setCreating(false)}
          onCreated={(patient) => {
            setPatients((current) => [...current, directoryPatient(patient)]);
            setCreating(false);
            navigate(`/doctor/${patient.id}`);
          }}
        />
      )}
    </div>
  );
}

function NewPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (patient: Patient) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    dob: "",
    diagnosis: "",
    lastAppointment: "",
    nextAppointment: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onCreated(await api.createPatient(form));
    } catch (err) {
      setError(String(err).includes("409") ? "A patient with this name and date of birth already exists." : "Could not create the patient.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/20 backdrop-blur-[2px] px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-patient-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={submit} className="card w-full max-w-md p-6 shadow-xl animate-fade-up">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="eyebrow mb-1">Patient directory</p>
            <h2 id="new-patient-title" className="text-lg font-semibold text-ink-900">Create new patient</h2>
          </div>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" value={form.name} onChange={(v) => update("name", v)} span />
          <Field label="Date of birth" type="date" value={form.dob} onChange={(v) => update("dob", v)} />
          <Field label="Condition" value={form.diagnosis} onChange={(v) => update("diagnosis", v)} />
          <Field label="Last appointment" type="date" value={form.lastAppointment} onChange={(v) => update("lastAppointment", v)} />
          <Field label="Next appointment" type="date" value={form.nextAppointment} onChange={(v) => update("nextAppointment", v)} />
        </div>

        {error && <p className="mt-3 text-[13px] text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-clay">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-clay text-[13px] font-medium text-ink-600 hover:bg-sand">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || Object.values(form).some((value) => !value.trim())}
            className="px-5 py-2 rounded-xl bg-indigo-500 text-white text-[13px] font-medium hover:bg-indigo-600 disabled:opacity-40"
          >
            {saving ? "Creating…" : "Create patient"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  span = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  span?: boolean;
}) {
  return (
    <label className={span ? "col-span-2" : ""}>
      <span className="text-[12px] font-medium text-ink-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full px-3 py-2.5 border border-clay rounded-xl bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
      />
    </label>
  );
}
