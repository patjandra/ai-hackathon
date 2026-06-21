import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InterimLogo from "./InterimLogo";

const DOCTOR_NAME = "Dr. Miller";

// Sticky desktop app bar for the doctor-facing pages: brand (→ directory),
// a global patient search, and an account chip. The search is dual-mode:
//  • Controlled (directory passes value/onChange) → filters the list live.
//  • Uncontrolled (dashboard) → navigates to /doctor?q=… on Enter.
export default function DoctorTopBar({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (v: string) => void;
}) {
  const navigate = useNavigate();
  const controlled = onChange !== undefined;
  const [local, setLocal] = useState("");
  const q = controlled ? (value ?? "") : local;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!controlled) navigate(`/doctor?q=${encodeURIComponent(local.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-clay/70 bg-white/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
        <button
          onClick={() => navigate("/doctor")}
          className="shrink-0 transition-opacity hover:opacity-80"
          aria-label="Interim — patient directory"
        >
          <InterimLogo size="md" />
        </button>

        <form onSubmit={submit} className="flex-1 max-w-md mx-auto hidden sm:block">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={q}
              onChange={(e) => (controlled ? onChange!(e.target.value) : setLocal(e.target.value))}
              placeholder="Search patients…"
              className="w-full pl-10 pr-3 py-2 text-[13px] bg-sand/70 border border-transparent rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-300 placeholder:text-ink-400 transition-colors"
            />
          </div>
        </form>

        <div className="shrink-0 flex items-center gap-2.5 pl-1">
          <div className="text-right hidden md:block leading-tight">
            <p className="text-[13px] font-medium text-ink-900">{DOCTOR_NAME}</p>
            <p className="text-[11px] text-ink-400">Rheumatology</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white grid place-items-center text-[13px] font-semibold shadow-soft">
            DM
          </div>
        </div>
      </div>
    </header>
  );
}
