interface Props { quote: string; date: string; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function PatientQuote({ quote, date }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Patient's Own Words</p>
      <blockquote className="text-gray-800 text-base italic leading-relaxed mb-2">
        "{quote}"
      </blockquote>
      <p className="text-xs text-gray-400 text-right">— {fmtDate(date)}</p>
    </div>
  );
}
