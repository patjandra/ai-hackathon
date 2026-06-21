// Interim wordmark + bullseye logo. The mark is three concentric rings, colored
// via currentColor so it inherits whatever text color it's placed in.
export function InterimMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="50" cy="50" r="45" strokeWidth="7" />
      <circle cx="50" cy="50" r="29" strokeWidth="7" />
      <circle cx="50" cy="50" r="13" strokeWidth="7" />
    </svg>
  );
}

const SIZES = {
  md: { mark: "w-7 h-7", text: "text-lg", gap: "gap-2" },
  lg: { mark: "w-11 h-11", text: "text-3xl", gap: "gap-1" },
  xl: { mark: "w-14 h-14", text: "text-4xl", gap: "gap-2" },
} as const;

export default function InterimLogo({
  className = "",
  size = "lg",
}: {
  className?: string;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <div className={`inline-flex items-center ${s.gap} ${className}`}>
      <InterimMark className={`${s.mark} text-indigo-600`} />
      <span className={`${s.text} font-semibold tracking-tight text-indigo-600`}>Interim</span>
    </div>
  );
}
