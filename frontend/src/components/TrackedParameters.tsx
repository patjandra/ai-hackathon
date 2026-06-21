import { useEffect, useState } from "react";
import { api } from "../lib/api";

const COMMON = [
  "Pain",
  "Fatigue",
  "Sleep quality",
  "Mood",
  "Swelling",
  "Medication adherence",
  "Mobility",
  "Nausea",
  "Exercise compliance",
];

const DEFAULT = ["Pain", "Fatigue", "Sleep quality", "Mood", "Medication adherence"];

export default function TrackedParameters({ patientId }: { patientId: string }) {
  const [selected, setSelected] = useState<string[]>(DEFAULT);
  const [customInput, setCustomInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    api.getTrackedParams(patientId)
      .then((d) => {
        setSelected(d.parameters ?? DEFAULT);
        setSavedAt(d.assignedAt);
      })
      .catch(() => setSelected(DEFAULT))
      .finally(() => setLoading(false));
  }, [patientId]);

  const toggle = (metric: string) => {
    setSelected((s) =>
      s.includes(metric) ? s.filter((x) => x !== metric) : [...s, metric],
    );
    setDirty(true);
  };

  const addCustom = () => {
    const t = customInput.trim();
    if (!t || selected.some((item) => item.toLocaleLowerCase() === t.toLocaleLowerCase())) return;
    setSelected((s) => [...s, t]);
    setCustomInput("");
    setDirty(true);
  };

  const removeCustom = async (param: string) => {
    const next = selected.filter((item) => item !== param);
    setPendingDelete(null);
    setSaving(true);
    try {
      const result = await api.setTrackedParams(patientId, next);
      setSelected(result.parameters);
      setSavedAt(new Date().toISOString());
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await api.setTrackedParams(patientId, selected);
      setSelected(result.parameters);
      setSavedAt(new Date().toISOString());
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const customParams = selected.filter((p) => !COMMON.includes(p));

  if (loading) return null;

  return (
    <section className="card p-5">
      <div className="mb-4">
        <h2 className="eyebrow mb-1">Tracked parameters for next visit</h2>
        <p className="text-[13px] text-ink-500 leading-relaxed">
          Checked items are actively tracked; everything else is captured only if mentioned.
        </p>
      </div>

      {/* Standard and doctor-added parameters share one consistent grid. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 mb-4">
        {COMMON.map((metric) => (
          <label key={metric} className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(metric)}
              onChange={() => toggle(metric)}
              className="w-4 h-4 rounded border-clay accent-indigo-500 cursor-pointer"
            />
            <span className="text-[13px] text-ink-700 group-hover:text-ink-900 transition-colors">
              {metric}
            </span>
          </label>
        ))}
        {customParams.map((param) => (
          <div key={param} className="group flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <input
                type="checkbox"
                checked
                readOnly
                tabIndex={-1}
                className="w-4 h-4 rounded border-clay accent-indigo-500 pointer-events-none"
              />
              <span className="text-[13px] text-ink-700 truncate">{param}</span>
            </div>
            <button
              type="button"
              onClick={() => setPendingDelete(param)}
              title={`Delete ${param}`}
              aria-label={`Delete ${param}`}
              className="shrink-0 p-1 rounded-md text-rose-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-rose-50 hover:text-rose-700 transition-all"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-900/20 backdrop-blur-[2px] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-parameter-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingDelete(null);
          }}
        >
          <div className="card w-full max-w-xs p-5 text-center shadow-xl animate-fade-up">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-rose-50 text-rose-500 grid place-items-center">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </div>
            <h3 id="delete-parameter-title" className="text-[15px] font-semibold text-ink-900">
              Remove parameter?
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
              <span className="font-medium text-ink-700">{pendingDelete}</span> will no longer
              appear in the patient&rsquo;s check-in topics.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-clay text-[13px] font-medium text-ink-600 hover:bg-sand transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeCustom(pendingDelete)}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-500 text-white text-[13px] font-medium hover:bg-rose-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add custom parameter */}
      <div className="flex gap-2 mb-4">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add custom parameter…"
          className="flex-1 border border-clay rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder:text-ink-400"
        />
        <button
          onClick={addCustom}
          disabled={
            !customInput.trim() ||
            selected.some((item) => item.toLocaleLowerCase() === customInput.trim().toLocaleLowerCase())
          }
          className="px-4 py-2 rounded-xl border border-clay text-[13px] text-ink-600 hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3 pt-3 border-t border-clay">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-5 py-2 rounded-xl bg-indigo-500 text-white text-[13px] font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving && (
            <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {saving ? "Saving…" : "Save parameters"}
        </button>
        {!dirty && savedAt && (
          <span className="text-[12px] text-green-600 font-medium">
            ✓ Saved · takes effect on next check-in
          </span>
        )}
        {dirty && (
          <span className="text-[12px] text-ink-400">Unsaved changes</span>
        )}
      </div>
    </section>
  );
}
