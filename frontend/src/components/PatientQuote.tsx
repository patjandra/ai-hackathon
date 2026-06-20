export default function PatientQuote({ quote, date }: { quote: string; date: string }) {
  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-3">PATIENT'S OWN WORDS</h2>
      <blockquote className="text-lg italic text-slate-700 leading-relaxed">“{quote}”</blockquote>
      <p className="mt-2 text-sm text-slate-400 text-right">
        — {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
    </section>
  );
}
