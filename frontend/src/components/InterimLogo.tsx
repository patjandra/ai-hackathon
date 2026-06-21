// Interim wordmark + bullseye logo. The mark is three concentric rings; colored
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

export default function InterimLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <InterimMark className="w-7 h-7 text-indigo-600" />
      <span className="text-lg font-semibold tracking-tight text-ink-900">Interim</span>
    </div>
  );
}
