import type { PhysicianSummary } from "../../../shared/types";

export default function SummaryCard({ summary }: { summary: PhysicianSummary }) {
  const m = summary.metricSummary;
  const cells: [string, string][] = [
    ["Pain", m.pain],
    ["Fatigue", m.fatigue],
    ["Adherence", m.adherence],
    ["Stiffness", m.morningStiffness],
    ["Swelling", m.swelling],
  ];
  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-3">SINCE LAST VISIT</h2>
      <p className="text-slate-700 leading-relaxed mb-5">{summary.assessment}</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cells.map(([label, val]) => (
          <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
            <div className="text-sm font-semibold text-slate-800">{val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
