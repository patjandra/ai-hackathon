interface Props {
  trajectory: "IMPROVING" | "STABLE" | "DECLINING";
  focusAreas: string[];
}

const TRAJECTORY_STYLES = {
  IMPROVING: "bg-green-100 text-green-800 border-green-200",
  STABLE:    "bg-gray-100 text-gray-700 border-gray-200",
  DECLINING: "bg-red-100 text-red-800 border-red-200",
};

const TRAJECTORY_ICONS = {
  IMPROVING: "↑",
  STABLE:    "→",
  DECLINING: "↓",
};

export function WhyThisVisitMatters({ trajectory, focusAreas }: Props) {
  return (
    <div className="bg-white rounded-xl border-2 border-teal-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Why This Visit Matters</p>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${TRAJECTORY_STYLES[trajectory]}`}>
          {TRAJECTORY_ICONS[trajectory]} {trajectory}
        </span>
      </div>
      <ul className="space-y-2">
        {focusAreas.map((area, i) => (
          <li key={i} className="flex gap-3 text-sm text-gray-800">
            <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span>
            <span>{area}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
