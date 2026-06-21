import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { CheckIn } from "../lib/types";

interface Props { checkins: CheckIn[]; }

export function MetricChart({ checkins }: Props) {
  const data = checkins.map((c) => ({
    date: c.date.slice(5).replace("-", "/"),
    pain: c.metrics?.pain?.value ?? null,
  }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Pain Over Time</p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: any) => [`${v}/10`, "Pain"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <ReferenceLine y={5} stroke="#e5e7eb" strokeDasharray="4 2" />
          <Line
            type="monotone" dataKey="pain" stroke="#ef4444"
            strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
