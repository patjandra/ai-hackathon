import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { CheckIn } from "../../../shared/types";

// Pain trend over time, built from the raw check-in series.
export default function MetricChart({ checkins }: { checkins: CheckIn[] }) {
  const data = checkins
    .filter((c) => c.metrics.pain.value !== null)
    .map((c) => ({
      date: new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pain: c.metrics.pain.value as number,
    }));

  return (
    <section className="card p-5 h-full">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="eyebrow">Pain over time</h2>
        <span className="text-xs text-ink-400">0–10 scale</span>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.26} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={34} />
          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 40px rgba(15,23,42,0.10)",
              fontSize: 13,
            }}
            labelStyle={{ color: "#64748b" }}
            cursor={{ stroke: "#6366f1", strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="pain"
            stroke="#4f46e5"
            strokeWidth={2.5}
            fill="url(#painFill)"
            dot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#4338ca" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
