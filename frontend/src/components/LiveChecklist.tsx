import { useEffect, useRef } from "react";
import type { ChecklistState, MetricKey } from "../../../shared/types";

const LABELS: Record<MetricKey, string> = {
  pain: "Pain level",
  fatigue: "Fatigue",
  swelling: "Swelling",
  morningStiffness: "Morning stiffness",
  medicationAdherence: "Medication",
};

// Short labels for the compact horizontal rail (mobile focal layout).
const SHORT: Record<MetricKey, string> = {
  pain: "Pain",
  fatigue: "Fatigue",
  swelling: "Swelling",
  morningStiffness: "Stiffness",
  medicationAdherence: "Meds",
};

const ORDER: MetricKey[] = ["pain", "fatigue", "swelling", "morningStiffness", "medicationAdherence"];

type Status = "confirmed" | "optimistic" | "missing";

function statusOf(state: ChecklistState, key: MetricKey): Status {
  if (state.confirmed.includes(key)) return "confirmed";
  // Amber = transient keyword hit OR a vague mention awaiting clarification.
  if (state.optimistic.includes(key) || state.ambiguous.includes(key)) return "optimistic";
  return "missing";
}

// Three visual states: dim / soft-highlight (amber, optimistic) / confirmed (indigo).
// `layout="rail"` renders a compact wrapping row of chips for the mobile header;
// the default vertical list is kept for any wider/sidebar usage.
export default function LiveChecklist({
  state,
  layout = "list",
}: {
  state: ChecklistState;
  layout?: "list" | "rail";
}) {
  if (layout === "rail") return <RailChecklist state={state} />;

  return (
    <ul className="w-full space-y-2">
      {ORDER.map((key) => {
        const status = statusOf(state, key);
        const confirmed = status === "confirmed";
        const optimistic = status === "optimistic";

        const wrap =
          "flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all duration-300 ease-out";
        const cls = confirmed
          ? "bg-indigo-50 border-indigo-200 shadow-soft"
          : optimistic
            ? "bg-amber-50 border-amber-200 scale-[1.02] shadow-soft"
            : "bg-white/70 border-clay/60";

        return (
          <li key={key} className={`${wrap} ${cls}`}>
            <Indicator confirmed={confirmed} optimistic={optimistic} />
            <span
              className={`text-[13px] font-medium leading-tight transition-colors duration-300 ${
                confirmed ? "text-indigo-800" : optimistic ? "text-amber-800" : "text-ink-400"
              }`}
            >
              {LABELS[key]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Single-row, horizontally scrollable chip rail. Height stays constant no matter
// how many topics there are; the first uncovered topic (the current focus) is
// auto-scrolled into view so it's never hidden off-screen.
function RailChecklist({ state }: { state: ChecklistState }) {
  const activeKey = ORDER.find((k) => statusOf(state, k) !== "confirmed");
  const activeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeKey]);

  return (
    <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ORDER.map((key) => {
        const status = statusOf(state, key);
        const cls =
          status === "confirmed"
            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
            : status === "optimistic"
              ? "bg-amber-50 border-amber-200 text-amber-700 scale-[1.03]"
              : "bg-white/70 border-clay/70 text-ink-400";
        return (
          <span
            key={key}
            ref={key === activeKey ? activeRef : undefined}
            className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-[12px] font-medium whitespace-nowrap shrink-0 transition-all duration-300 ease-out ${cls}`}
          >
            <Dot status={status} />
            {SHORT[key]}
          </span>
        );
      })}
    </div>
  );
}

// Compact dot/check for the rail chips.
function Dot({ status }: { status: Status }) {
  if (status === "confirmed")
    return (
      <span className="w-4 h-4 rounded-full bg-indigo-500 text-white grid place-items-center text-[9px] shrink-0">
        ✓
      </span>
    );
  if (status === "optimistic")
    return <span className="w-4 h-4 rounded-full bg-amber-400/90 animate-soft-pulse shrink-0" />;
  return <span className="w-4 h-4 rounded-full border-2 border-clay shrink-0" />;
}

function Indicator({ confirmed, optimistic }: { confirmed: boolean; optimistic: boolean }) {
  if (confirmed)
    return (
      <span className="w-5 h-5 rounded-full bg-indigo-500 text-white grid place-items-center text-xs shrink-0">
        ✓
      </span>
    );
  if (optimistic)
    return <span className="w-5 h-5 rounded-full bg-amber-400/90 animate-soft-pulse shrink-0" />;
  return <span className="w-5 h-5 rounded-full border-2 border-clay shrink-0" />;
}
