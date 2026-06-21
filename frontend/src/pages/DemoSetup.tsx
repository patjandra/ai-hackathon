import { useState } from "react";
import { api } from "../lib/api";

// Dev convenience: trigger a Redis re-seed and jump to the dashboard.
export default function DemoSetup() {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const seed = async () => {
    setBusy(true);
    setStatus("Seeding…");
    try {
      const { patientId, dashboardUrl } = await api.seed();
      setStatus(`Seeded ${patientId}.\n${dashboardUrl}`);
    } catch (e) {
      setStatus(`Failed: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 max-w-sm w-full text-center">
        <p className="eyebrow mb-1">Demo setup</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 mb-6">Reset the demo data</h1>
        <button
          onClick={seed}
          disabled={busy}
          className="px-7 py-3 rounded-full bg-indigo-500 text-white font-medium shadow-glow active:scale-95 transition-transform disabled:opacity-60"
        >
          {busy ? "Seeding…" : "Seed Sarah Chen"}
        </button>
        {status && <p className="mt-5 text-ink-500 text-sm whitespace-pre-line break-words">{status}</p>}
      </div>
    </div>
  );
}
