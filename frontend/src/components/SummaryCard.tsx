import type { PhysicianSummary } from "../../../shared/types";

// Trim trailing parentheticals so chips stay tight ("10 → 30 min (recent increase)"
// → "10 → 30 min"); the nuance still lives in the assessment text above.
const tidy = (v: string) => v.replace(/\s*\([^)]*\)\s*$/, "").trim();

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
    <section className="card p-5">
      <h2 className="eyebrow mb-3">Since last visit</h2>
      <p className="text-ink-700 leading-7 text-sm mb-5">{summary.assessment}</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-clay">
        {cells.map(([label, val], i) => (
          <div
            key={label}
            className={`py-3 sm:px-4 ${i % 2 === 1 ? "pl-4 sm:pl-4" : "pr-4 sm:px-4"} ${
              i > 0 ? "sm:border-l border-clay" : ""
            }`}
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-ink-400">{label}</div>
            <div className="mt-1 text-[13px] font-medium text-ink-900 leading-snug tabular-nums">{tidy(val)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
