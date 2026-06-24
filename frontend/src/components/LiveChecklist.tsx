import { useEffect, useRef } from "react";
import type { ChecklistState } from "../../../shared/types";

type Status = "confirmed" | "optimistic" | "missing";

function statusOf(state: ChecklistState, key: string): Status {
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
  topics,
  layout = "list",
}: {
  state: ChecklistState;
  topics: string[];
  layout?: "list" | "rail";
}) {
  if (layout === "rail") return <RailChecklist state={state} topics={topics} />;

  return (
    <ul className="w-full space-y-2">
      {topics.map((key) => {
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
              {key}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Topic cards in a horizontally scrollable row, fronted by a progress bar that
// fills purple proportionally (and animates) as topics are covered. Each card
// carries a simple line icon, the topic name, and a corner status dot. The first
// uncovered topic (the current focus) is auto-scrolled into view.
function RailChecklist({ state, topics }: { state: ChecklistState; topics: string[] }) {
  const activeKey = topics.find((k) => statusOf(state, k) !== "confirmed");
  const activeRef = useRef<HTMLDivElement>(null);
  const pct = topics.length ? (state.confirmed.length / topics.length) * 100 : 0;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeKey]);

  return (
    <div>
      {/* Proportional progress: the purple fill animates its width on each cover. */}
      <div className="h-2 w-full rounded-full bg-indigo-100/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {topics.map((key) => {
          const status = statusOf(state, key);
          const cls =
            status === "confirmed"
              ? "bg-indigo-50 border-indigo-200"
              : status === "optimistic"
                ? "bg-amber-50 border-amber-300"
                : "bg-white border-clay/70";
          const iconColor =
            status === "confirmed"
              ? "text-indigo-600"
              : status === "optimistic"
                ? "text-amber-600"
                : "text-ink-500";
          const labelColor =
            status === "confirmed"
              ? "text-indigo-800"
              : status === "optimistic"
                ? "text-amber-800"
                : "text-ink-700";
          return (
            <div
              key={key}
              ref={key === activeKey ? activeRef : undefined}
              className={`flex-1 min-w-[7.5rem] rounded-2xl border px-3.5 py-3 transition-all duration-300 ease-out ${cls}`}
            >
              <div className="flex items-start justify-between">
                <span className={`transition-colors duration-300 ${iconColor}`}>
                  <TopicIcon name={key} />
                </span>
                <CornerDot status={status} />
              </div>
              <span
                className={`mt-2.5 block text-[14px] font-medium capitalize leading-tight transition-colors duration-300 ${labelColor}`}
              >
                {key}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Corner status dot: soft gray (missing), pulsing amber (optimistic), or a filled
// indigo check (confirmed) — the purple fill that lands "on completion".
function CornerDot({ status }: { status: Status }) {
  if (status === "confirmed")
    return (
      <span className="w-4 h-4 rounded-full bg-indigo-500 text-white grid place-items-center text-[9px] shrink-0 shadow-soft">
        ✓
      </span>
    );
  if (status === "optimistic")
    return <span className="mt-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-soft-pulse shrink-0" />;
  return <span className="mt-0.5 w-2.5 h-2.5 rounded-full bg-clay shrink-0" />;
}

// Simple line symbol per topic, matched on the (lowercased) topic name with a
// neutral clipboard fallback for custom/doctor-defined topics.
function TopicIcon({ name }: { name: string }) {
  const svg = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name.trim().toLowerCase()) {
    case "pain":
      return (
        <svg {...svg}>
          <path d="M4 13h3l2-5 3 8 2-4h6" />
        </svg>
      );
    case "fatigue":
    case "energy":
      return (
        <svg {...svg}>
          <rect x="2.5" y="9" width="15" height="6.5" rx="2" />
          <line x1="20" y1="11" x2="20" y2="13" />
        </svg>
      );
    case "mood":
      return (
        <svg {...svg}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 14.5a4 4 0 0 0 7 0" />
          <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "swelling":
      return (
        <svg {...svg}>
          <path d="M12 3.5c3.5 4 5.5 6.5 5.5 9.5a5.5 5.5 0 0 1-11 0c0-3 2-5.5 5.5-9.5z" />
        </svg>
      );
    case "morning stiffness":
    case "stiffness":
      return (
        <svg {...svg}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "medication adherence":
    case "medication":
      return (
        <svg {...svg}>
          <g transform="rotate(45 12 12)">
            <rect x="3.5" y="9" width="17" height="6" rx="3" />
            <line x1="12" y1="9" x2="12" y2="15" />
          </g>
        </svg>
      );
    case "sleep":
      return (
        <svg {...svg}>
          <path d="M20 13.5A8 8 0 1 1 10.5 4 6.2 6.2 0 0 0 20 13.5z" />
        </svg>
      );
    default:
      return (
        <svg {...svg}>
          <rect x="6" y="4.5" width="12" height="15" rx="2" />
          <path d="M9.5 4.5V3.5h5v1" />
          <line x1="9.5" y1="9.5" x2="14.5" y2="9.5" />
          <line x1="9.5" y1="13" x2="13" y2="13" />
        </svg>
      );
  }
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
