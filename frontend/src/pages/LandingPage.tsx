import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-10">
      <main className="w-full max-w-3xl text-center">
        <img
          src="/interim-wordmark.png"
          alt="Interim"
          className="h-16 sm:h-20 w-auto mx-auto mb-8"
        />

        <p className="eyebrow mb-3">Between visits, better understood</p>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-ink-900 leading-tight">
          Turn patient check-ins into
          <span className="block text-indigo-500">physician-ready insight.</span>
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-ink-500">
          Interim captures health updates between appointments and creates concise summaries
          so care teams can understand what changed before the next visit.
        </p>

        <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          <Link
            to="/login"
            className="card group p-5 text-left hover:border-indigo-300 hover:-translate-y-0.5 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 grid place-items-center mb-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="text-[15px] font-semibold text-ink-900">Patient login</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
              Complete a quick check-in and share changes with your care team.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-indigo-500">
              Start check-in <span aria-hidden="true">→</span>
            </span>
          </Link>

          <Link
            to="/doctor"
            className="card group p-5 text-left hover:border-indigo-300 hover:-translate-y-0.5 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-sand text-ink-600 grid place-items-center mb-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18" />
                <path d="M6 21V7l6-4 6 4v14" />
                <path d="M9 12h6M12 9v6" />
              </svg>
            </div>
            <h2 className="text-[15px] font-semibold text-ink-900">Doctor dashboard</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
              Review patient trends, tracked topics, alerts, and generated Interims.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-indigo-500">
              Open dashboard <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>

        <p className="mt-8 text-[12px] text-ink-400">
          AI-powered longitudinal patient briefing for more prepared appointments.
        </p>
      </main>
    </div>
  );
}
