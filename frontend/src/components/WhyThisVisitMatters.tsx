import type { WhyThisVisitMatters as Data } from "../../../shared/types";

const COLOR: Record<Data["trajectory"], string> = {
  IMPROVING: "text-emerald-600",
  STABLE: "text-amber-600",
  DECLINING: "text-rose-600",
};

export default function WhyThisVisitMatters({ data }: { data: Data }) {
  return (
    <section className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-sky-500">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-bold tracking-widest text-slate-400">WHY THIS VISIT MATTERS</h2>
        <span className={`text-sm font-semibold ${COLOR[data.trajectory]}`}>
          Overall trajectory: {data.trajectory}
        </span>
      </div>
      <ul className="space-y-2">
        {data.focusAreas.map((area, i) => (
          <li key={i} className="flex gap-2 text-slate-700">
            <span className="text-sky-500">•</span>
            <span>{area}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
