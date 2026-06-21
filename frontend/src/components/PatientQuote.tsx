export default function PatientQuote({ quote, date }: { quote: string; date: string }) {
  return (
    <section className="relative card p-5 overflow-hidden">
      <span
        className="absolute -top-5 left-4 text-[6rem] leading-none font-semibold text-indigo-500/10 select-none"
        aria-hidden
      >
        &ldquo;
      </span>
      <h2 className="eyebrow mb-3">Patient&rsquo;s own words</h2>
      <blockquote className="relative text-lg font-medium text-ink-900 leading-relaxed tracking-tight">
        {quote}
      </blockquote>
      <p className="mt-3 text-[13px] text-ink-400 text-right">
        — {new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
      </p>
    </section>
  );
}
