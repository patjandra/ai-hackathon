import type { PhysicianSummary } from "../lib/types";

type Direction = "improving" | "worsening" | "stable" | "watch";

interface CardDef {
  key: keyof PhysicianSummary["metricSummary"];
  label: string;
  lowerIsBetter: boolean;
}

const CARDS: CardDef[] = [
  { key: "pain",             label: "Pain",      lowerIsBetter: true  },
  { key: "fatigue",          label: "Fatigue",   lowerIsBetter: true  },
  { key: "morningStiffness", label: "Stiffness", lowerIsBetter: true  },
  { key: "adherence",        label: "Adherence", lowerIsBetter: false },
  { key: "swelling",         label: "Swelling",  lowerIsBetter: true  },
];

function inferDirection(text: string, lowerIsBetter: boolean): Direction {
  const t = text.toLowerCase();
  if (t.includes("missed") || t.includes("partial")) return "watch";
  if (t.includes("resolv") || t.includes("none") || t.includes("clear")) return "improving";
  if (t.includes("increas") || t.includes("worsening") || t.includes("spike") || t.includes("recent increase")) return "worsening";
  if (t.includes("→")) {
    const nums = text.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    if (nums.length >= 2) {
      const delta = nums[nums.length - 1] - nums[0];
      if (delta === 0) return "stable";
      return lowerIsBetter
        ? (delta < 0 ? "improving" : "worsening")
        : (delta > 0 ? "improving" : "worsening");
    }
    // text direction: "high → low"
    if (t.includes("high") && t.indexOf("high") < t.indexOf("low")) return "improving";
    if (t.includes("low") && t.indexOf("low") < t.indexOf("high")) return "worsening";
  }
  if (t === "yes" || t.includes("100%")) return "improving";
  return "stable";
}

function extractBig(text: string, key: string): { value: string; unit: string } {
  if (key === "pain") {
    const nums = text.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    const last = nums[nums.length - 1];
    return last !== undefined ? { value: String(last), unit: "/10" } : { value: text, unit: "" };
  }
  if (key === "morningStiffness") {
    const nums = text.match(/\d+/g)?.map(Number) ?? [];
    const last = nums[nums.length - 1];
    return last !== undefined ? { value: String(last), unit: " min" } : { value: text, unit: "" };
  }
  if (key === "adherence") {
    if (text.toLowerCase().includes("missed")) {
      const n = text.match(/\d+/)?.[0] ?? "1";
      return { value: n, unit: " missed" };
    }
    return { value: "✓", unit: "" };
  }
  // fatigue / swelling: last word before any parenthetical
  const clean = text.split("(")[0].trim();
  const last = clean.includes("→") ? clean.split("→").pop()?.trim() ?? clean : clean;
  return { value: last, unit: "" };
}

const DIR_STYLES: Record<Direction, { bg: string; border: string; text: string; arrow: string; label: string }> = {
  improving: { bg: "bg-green-50",  border: "border-green-200", text: "text-green-700", arrow: "↓", label: "Improving" },
  worsening: { bg: "bg-red-50",   border: "border-red-200",   text: "text-red-700",   arrow: "↑", label: "Worsening" },
  watch:     { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", arrow: "!", label: "Watch"     },
  stable:    { bg: "bg-gray-50",  border: "border-gray-200",  text: "text-gray-600",  arrow: "→", label: "Stable"    },
};

interface Props {
  metricSummary: PhysicianSummary["metricSummary"];
}

export function MetricCards({ metricSummary }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2 mb-4">
      {CARDS.map(({ key, label, lowerIsBetter }) => {
        const raw = metricSummary[key] ?? "—";
        const dir = inferDirection(raw, lowerIsBetter);
        const { value, unit } = extractBig(raw, key);
        const s = DIR_STYLES[dir];

        return (
          <div key={key} className={`rounded-xl border p-3 flex flex-col gap-1 ${s.bg} ${s.border}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <div className={`flex items-baseline gap-0.5 ${s.text}`}>
              <span className="text-2xl font-bold leading-none">{value}</span>
              {unit && <span className="text-xs font-medium">{unit}</span>}
            </div>
            <div className={`flex items-center gap-1 ${s.text}`}>
              <span className="text-xs font-bold">{s.arrow}</span>
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">{raw}</p>
          </div>
        );
      })}
    </div>
  );
}
