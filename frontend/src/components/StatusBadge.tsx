import type { InterimStatus } from "../lib/patients";

const CONFIG: Record<InterimStatus, { label: string; cls: string; dot: string }> = {
  "ready":        { label: "Interim Ready", cls: "bg-green-50 text-green-700 ring-green-200",   dot: "bg-green-500"  },
  "needs-review": { label: "Needs Review",  cls: "bg-amber-50 text-amber-700 ring-amber-200",   dot: "bg-amber-500"  },
  "no-interim":   { label: "No Interim",    cls: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-400" },
  "no-checkins":  { label: "No Check-ins",  cls: "bg-sand text-ink-400 ring-clay",               dot: "bg-ink-400"   },
};

export default function StatusBadge({ status }: { status: InterimStatus }) {
  const c = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full ring-1 whitespace-nowrap ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}
