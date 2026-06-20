import type { KeyEvent } from "../../../shared/types";

const DOT: Record<KeyEvent["severity"], string> = {
  routine: "bg-slate-300",
  notable: "bg-amber-400",
  urgent: "bg-rose-500",
};

export default function KeyEvents({ events }: { events: KeyEvent[] }) {
  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-3">KEY EVENTS</h2>
      <ol className="space-y-3">
        {events.map((e, i) => (
          <li key={i} className="flex gap-3">
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${DOT[e.severity]}`} />
            <div>
              <div className="text-sm font-medium text-slate-800">
                {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              <div className="text-sm text-slate-600">{e.description}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
