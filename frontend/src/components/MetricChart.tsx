import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { CheckIn } from "../../../shared/types";

// Pain trend over time, built from the raw check-in series (plan issue D).
export default function MetricChart({ checkins }: { checkins: CheckIn[] }) {
  const data = checkins
    .filter((c) => c.metrics.pain.value !== null)
    .map((c) => ({
      date: new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pain: c.metrics.pain.value as number,
    }));

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-3">PAIN OVER TIME</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="pain" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
