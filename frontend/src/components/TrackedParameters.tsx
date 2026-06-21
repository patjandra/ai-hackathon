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
    if (!t || selected.includes(t)) return;
    setSelected((s) => [...s, t]);
    setCustomInput("");
    setDirty(true);
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

      {/* Common metrics grid */}
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
      </div>

      {/* Custom params added by doctor */}
      {customParams.length > 0 && (
        <div className="mb-3 space-y-2">
          {customParams.map((param) => (
            <div key={param} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked
                onChange={() => toggle(param)}
                className="w-4 h-4 rounded border-clay accent-indigo-500 cursor-pointer"
              />
              <span className="text-[13px] text-ink-700 flex-1">{param}</span>
              <button
                onClick={() => toggle(param)}
                className="text-[11px] text-rose-400 hover:text-rose-600 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
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
          disabled={!customInput.trim() || selected.includes(customInput.trim())}
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
