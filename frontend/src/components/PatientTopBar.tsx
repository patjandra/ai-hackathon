import type { Patient } from "../../../shared/types";

// Mobile app bar for the patient check-in. Mirrors DoctorTopBar but sized for a
// phone: a small brand mark on the left, the condition + who the check-in is for
// stacked (and truncated) in the middle, and Log out on the right. It is sticky
// and extends its background into the notch via the top safe-area inset.
export default function PatientTopBar({
  patient,
  doctor,
  onLogout,
}: {
  patient: Patient;
  doctor: string;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-clay/70 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-md px-4 h-14 flex items-center gap-3">
        <div className="flex-1 min-w-0 flex justify-start">
          <img src="/interim-wordmark.png" alt="Interim" className="h-7 w-auto shrink-0" />
        </div>

        <div className="min-w-0 max-w-[58%] text-center leading-tight">
          <p className="text-[12px] font-semibold text-ink-900 truncate">{patient.diagnosis}</p>
          <p className="text-[11px] text-ink-600 truncate">Check-in for {doctor}</p>
        </div>

        <div className="flex-1 min-w-0 flex justify-end">
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 text-[12px] font-semibold text-ink-600 hover:text-red-500 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
