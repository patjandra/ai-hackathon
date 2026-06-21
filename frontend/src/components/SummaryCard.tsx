interface MetricSummary {
  pain: string;
  fatigue: string;
  adherence: string;
  morningStiffness: string;
  swelling: string;
}

interface Props {
  assessment: string;
  metricSummary: MetricSummary;
  checkInCount: number;
  dateRange: { from: string; to: string };
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-lg px-3 py-2 min-w-0">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-center">{value}</span>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SummaryCard({ assessment, metricSummary, checkInCount, dateRange }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Since Last Visit</p>
        <span className="text-xs text-gray-400">
          {fmtDate(dateRange.from)} – {fmtDate(dateRange.to)} · {checkInCount} check-in{checkInCount !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-gray-800 leading-relaxed text-sm mb-4">{assessment}</p>
      <div className="grid grid-cols-5 gap-2">
        <MetricPill label="Pain" value={metricSummary.pain} />
        <MetricPill label="Fatigue" value={metricSummary.fatigue} />
        <MetricPill label="Adherence" value={metricSummary.adherence} />
        <MetricPill label="Stiffness" value={metricSummary.morningStiffness} />
        <MetricPill label="Swelling" value={metricSummary.swelling} />
      </div>
    </div>
  );
}
