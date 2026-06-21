import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { CheckIn } from "../lib/types";

interface KeyEvent { date: string; description: string; severity: string; }
interface Props { checkins: CheckIn[]; keyEvents: KeyEvent[]; }

function toXKey(iso: string) {
  return iso.slice(5).replace("-", "/");   // "2025-10-09" → "10/09"
}

const SEV_COLOR: Record<string, string> = {
  urgent:  "#ef4444",
  notable: "#f59e0b",
  routine: "#94a3b8",
};

// Short label for event overlays — keep under ~18 chars
function shortLabel(desc: string) {
  if (desc.length <= 18) return desc;
  return desc.slice(0, 16) + "…";
}

const CustomDot = (eventSet: Set<string>) => (props: any) => {
  const { cx, cy, payload } = props;
  if (eventSet.has(payload.date)) {
    return <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />;
  }
  return <circle cx={cx} cy={cy} r={3} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />;
};

export function PainChart({ checkins, keyEvents }: Props) {
  const data = checkins.map(c => ({
    date: toXKey(c.date),
    pain: typeof c.metrics?.pain?.value === "number" ? c.metrics.pain.value : null,
  }));

  const eventSet = new Set(keyEvents.map(e => toXKey(e.date)));

  if (!data.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pain Over Time</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> Clinical event
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" /> Check-in
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: any) => [`${v}/10`, "Pain"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}
            labelStyle={{ color: "#6b7280" }}
          />

          {/* Event reference lines */}
          {keyEvents.map(ev => (
            <ReferenceLine
              key={ev.date}
              x={toXKey(ev.date)}
              stroke={SEV_COLOR[ev.severity] ?? SEV_COLOR.routine}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: shortLabel(ev.description),
                position: "insideTopLeft",
                fontSize: 9,
                fill: SEV_COLOR[ev.severity] ?? SEV_COLOR.routine,
                dy: -2,
              }}
            />
          ))}

          <ReferenceLine y={5} stroke="#e5e7eb" strokeDasharray="6 3" />
          <Line
            type="monotone"
            dataKey="pain"
            stroke="#ef4444"
            strokeWidth={2}
            dot={CustomDot(eventSet)}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
