import type { ChecklistState, MetricKey } from "../../../shared/types";

const LABELS: Record<MetricKey, string> = {
  pain: "Pain level",
  fatigue: "Fatigue",
  swelling: "Swelling",
  morningStiffness: "Morning stiffness",
  medicationAdherence: "Medication",
};

const ORDER: MetricKey[] = ["pain", "fatigue", "swelling", "morningStiffness", "medicationAdherence"];

// Three visual states: dim (⬜), soft-highlight (🔆 yellow), confirmed (✅ green).
export default function LiveChecklist({ state }: { state: ChecklistState }) {
  return (
    <ul className="w-full space-y-2 mb-8">
      {ORDER.map((key) => {
        const confirmed = state.confirmed.includes(key);
        const optimistic = !confirmed && state.optimistic.includes(key);
        const base = "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors";
        const cls = confirmed
          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
          : optimistic
            ? "bg-amber-50 border-amber-300 text-amber-800"
            : "bg-white border-slate-200 text-slate-400";
        return (
          <li key={key} className={`${base} ${cls}`}>
            <span>{confirmed ? "✅" : optimistic ? "🔆" : "⬜"}</span>
            <span className="font-medium">{LABELS[key]}</span>
          </li>
        );
      })}
    </ul>
  );
}
