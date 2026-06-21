import type { ChecklistItemState } from "../lib/types";

interface Item { key: string; label: string; }

interface Props {
  items: Item[];
  optimistic: string[];
  confirmed: string[];
  missing: string[];
}

function getState(key: string, optimistic: string[], confirmed: string[], missing: string[]): ChecklistItemState {
  if (confirmed.includes(key)) return "confirmed";
  if (missing.includes(key)) return "missing";
  if (optimistic.includes(key)) return "optimistic";
  return "dim";
}

const STYLES: Record<ChecklistItemState, string> = {
  dim:       "border-transparent text-gray-400",
  optimistic:"border-amber-300 bg-amber-50 text-amber-800",
  confirmed: "border-green-300 bg-green-50 text-green-800",
  missing:   "border-gray-200 bg-gray-50 text-gray-500",
};

const ICONS: Record<ChecklistItemState, string> = {
  dim:       "○",
  optimistic:"◐",
  confirmed: "✓",
  missing:   "○",
};

export function LiveChecklist({ items, optimistic, confirmed, missing }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const state = getState(item.key, optimistic, confirmed, missing);
        return (
          <div
            key={item.key}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${STYLES[state]}`}
          >
            <span className="text-xs leading-none">{ICONS[state]}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
