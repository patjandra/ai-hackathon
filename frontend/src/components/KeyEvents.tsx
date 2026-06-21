import type { KeyEvent } from "../../../shared/types";

const DOT: Record<KeyEvent["severity"], string> = {
  routine: "bg-ink-400",
  notable: "bg-amber-500",
  urgent: "bg-rose-500",
};

export default function KeyEvents({ events }: { events: KeyEvent[] }) {
  return (
    <section className="card p-5 h-full">
      <h2 className="eyebrow mb-4">Key events</h2>
      <ol className="relative space-y-4">
        {/* connecting rail */}
        <span className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-clay" aria-hidden />
        {events.map((e, i) => (
          <li key={i} className="relative flex gap-3.5 pl-1">
            <span
              className={`relative z-10 mt-1.5 w-2 h-2 rounded-full ring-4 ring-white shrink-0 ${DOT[e.severity]}`}
            />
            <div className="-mt-0.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
                {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              <div className="text-[13px] text-ink-700 leading-snug mt-0.5">{e.description}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
