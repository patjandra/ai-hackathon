import type { WhyThisVisitMatters as Data } from "../../../shared/types";

const TRAJECTORY: Record<Data["trajectory"], { label: string; cls: string; dot: string }> = {
  IMPROVING: { label: "Improving", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
  STABLE: { label: "Stable", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  DECLINING: { label: "Declining", cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
};

export default function WhyThisVisitMatters({ data }: { data: Data }) {
  const t = TRAJECTORY[data.trajectory] ?? TRAJECTORY.STABLE;
  return (
    <section className="relative card overflow-hidden">
      {/* accent rail */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-400 to-indigo-600" />
      <div className="p-5 pl-6">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h2 className="eyebrow">Why this visit matters</h2>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ring-1 ${t.cls}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
            {t.label}
          </span>
        </div>
        <ul className="space-y-2.5">
          {data.focusAreas.map((area, i) => (
            <li key={i} className="flex gap-3 text-[14px] text-ink-700 leading-6">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span>{area}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
