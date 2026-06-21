import type { ChecklistState, MetricKey } from "../../../shared/types";

const LABELS: Record<MetricKey, string> = {
  pain: "Pain level",
  fatigue: "Fatigue",
  swelling: "Swelling",
  morningStiffness: "Morning stiffness",
  medicationAdherence: "Medication",
};

const ORDER: MetricKey[] = ["pain", "fatigue", "swelling", "morningStiffness", "medicationAdherence"];

// Three visual states: dim / soft-highlight (amber, optimistic) / confirmed (indigo).
export default function LiveChecklist({ state }: { state: ChecklistState }) {
  return (
    <ul className="w-full space-y-2.5 mb-8">
      {ORDER.map((key) => {
        const confirmed = state.confirmed.includes(key);
        const optimistic = !confirmed && state.optimistic.includes(key);

        const wrap =
          "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all duration-300 ease-out";
        const cls = confirmed
          ? "bg-indigo-50 border-indigo-200 shadow-soft"
          : optimistic
            ? "bg-amber-50 border-amber-200 scale-[1.015] shadow-soft"
            : "bg-white/70 border-clay/60";

        return (
          <li key={key} className={`${wrap} ${cls}`}>
            <Indicator confirmed={confirmed} optimistic={optimistic} />
            <span
              className={`font-medium transition-colors duration-300 ${
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

function Indicator({ confirmed, optimistic }: { confirmed: boolean; optimistic: boolean }) {
  if (confirmed)
    return (
      <span className="w-6 h-6 rounded-full bg-indigo-500 text-white grid place-items-center text-sm shrink-0">
        ✓
      </span>
    );
  if (optimistic)
    return <span className="w-6 h-6 rounded-full bg-amber-400/90 animate-soft-pulse shrink-0" />;
  return <span className="w-6 h-6 rounded-full border-2 border-clay shrink-0" />;
}
