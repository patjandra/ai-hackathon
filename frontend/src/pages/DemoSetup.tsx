import { useState } from "react";
import { api } from "../lib/api";

// Dev convenience: trigger a Redis re-seed and jump to the dashboard.
export default function DemoSetup() {
  const [status, setStatus] = useState<string>("");

  const seed = async () => {
    setStatus("Seeding…");
    try {
      const { patientId, dashboardUrl } = await api.seed();
      setStatus(`Seeded ${patientId}. Dashboard: ${dashboardUrl}`);
    } catch (e) {
      setStatus(`Failed: ${e}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <h1 className="text-xl font-semibold text-slate-800">Demo setup</h1>
      <button onClick={seed} className="px-6 py-3 rounded-full bg-sky-600 text-white">
        Seed Sarah Chen
      </button>
      <p className="text-slate-500 text-sm max-w-md text-center">{status}</p>
    </div>
  );
}
