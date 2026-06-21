import { useState, useCallback } from "react";
import type { ChecklistState, MetricKey } from "../../../shared/types";

// Phase 1 optimistic highlighting vocabulary. Distinctive, low-ambiguity terms
// only — this is a "feels responsive" hint, and Claude confirms the truth in
// Phase 2. Ambiguous words (bare digits, "morning", "ten", "energy") are left
// out so they don't trip the wrong row.
const METRIC_KEYWORDS: Record<MetricKey, string[]> = {
  pain: ["pain", "painful", "hurt", "hurts", "hurting", "ache", "aches", "aching", "sore", "throbbing"],
  fatigue: ["tired", "fatigue", "fatigued", "exhausted", "exhaustion", "drained", "worn out", "no energy", "low energy"],
  swelling: ["swelling", "swollen", "puffy", "inflamed", "inflammation"],
  morningStiffness: ["stiff", "stiffness", "morning stiffness", "stiff in the morning"],
  medicationAdherence: ["medication", "meds", "pill", "pills", "dose", "doses", "took my", "missed my", "missed a", "forgot", "skipped"],
};

// Match whole words/phrases (not substrings) so "tender" can't trip "ten".
const wordRe = (kw: string) => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);

// No API call — runs on every interim transcript, instant.
export function optimisticHighlight(transcript: string): MetricKey[] {
  const lower = transcript.toLowerCase();
  return (Object.entries(METRIC_KEYWORDS) as [MetricKey, string[]][])
    .filter(([, kws]) => kws.some((kw) => wordRe(kw).test(lower)))
    .map(([metric]) => metric);
}

export function useChecklist() {
  const [state, setState] = useState<ChecklistState>({ optimistic: [], confirmed: [], missing: [] });

  // Phase 1: union new optimistic hits with what we've already lit up.
  const scanInterim = useCallback((transcript: string) => {
    const hits = optimisticHighlight(transcript);
    setState((s) => ({ ...s, optimistic: Array.from(new Set([...s.optimistic, ...hits])) }));
  }, []);

  // Phase 2: Claude's confirmed truth wins.
  const applyConfirmed = useCallback((confirmed: MetricKey[], missing: MetricKey[]) => {
    setState({ optimistic: [], confirmed, missing });
  }, []);

  // Clear only the transient highlights; keep confirmed + missing intact.
  // Used when re-recording to answer a follow-up so completed checks persist.
  const clearOptimistic = useCallback(() => setState((s) => ({ ...s, optimistic: [] })), []);

  const reset = useCallback(() => setState({ optimistic: [], confirmed: [], missing: [] }), []);

  return { state, scanInterim, applyConfirmed, clearOptimistic, reset };
}
