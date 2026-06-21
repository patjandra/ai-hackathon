import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";
import type { CheckIn } from "../lib/types";

const FATIGUE_SCORE: Record<string, number> = { low: 2, moderate: 5, high: 9 };
const SWELLING_SCORE: Record<string, number> = { none: 0, mild: 4, significant: 9 };

interface SparkProps {
  data: { date: string; value: number | null }[];
  color: string;
  label: string;
  domain: [number, number];
  formatTip: (v: number) => string;
}

function Spark({ data, color, label, domain, formatTip }: SparkProps) {
  const hasData = data.some(d => d.value !== null);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      {hasData ? (
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <Tooltip
              formatter={(v: any) => [formatTip(v), label]}
              contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }}
              labelStyle={{ color: "#9ca3af", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-gray-300 italic">No data</p>
      )}
    </div>
  );
}

export function SparklineRow({ checkins }: { checkins: CheckIn[] }) {
  const fatigue = checkins.map(c => ({
    date: c.date.slice(5),
    value: FATIGUE_SCORE[(c.metrics?.fatigue?.value as string)?.toLowerCase()] ?? null,
  }));

  const stiffness = checkins.map(c => {
    const v = c.metrics?.morning_stiffness?.value;
    return { date: c.date.slice(5), value: typeof v === "number" ? v : null };
  });

  const swelling = checkins.map(c => ({
    date: c.date.slice(5),
    value: SWELLING_SCORE[(c.metrics?.swelling?.value as string)?.toLowerCase()] ?? null,
  }));

  return (
    <div className="flex gap-3 mb-4">
      <Spark
        data={fatigue}
        color="#8b5cf6"
        label="Fatigue"
        domain={[0, 10]}
        formatTip={v => v <= 2 ? "Low" : v <= 5 ? "Moderate" : "High"}
      />
      <Spark
        data={stiffness}
        color="#f59e0b"
        label="Stiffness"
        domain={[0, 90]}
        formatTip={v => `${v} min`}
      />
      <Spark
        data={swelling}
        color="#06b6d4"
        label="Swelling"
        domain={[0, 10]}
        formatTip={v => v === 0 ? "None" : v <= 4 ? "Mild" : "Significant"}
      />
    </div>
  );
}
