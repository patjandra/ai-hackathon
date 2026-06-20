import { useState, useCallback } from "react";
import type { ChecklistState, MetricKey } from "../../../shared/types";

// Phase 1 optimistic highlighting vocabulary. Includes spelled-out numbers as
// well as digits (plan LOW note: interim transcripts may render "five" not "5").
const METRIC_KEYWORDS: Record<MetricKey, string[]> = {
  pain: ["pain", "hurt", "ache", "sore", "tender", "burning", "throbbing", "6", "7", "8", "9", "10", "six", "seven", "eight", "nine", "ten"],
  fatigue: ["tired", "fatigue", "exhausted", "energy", "worn out", "drained"],
  swelling: ["swelling", "swollen", "puffy", "inflamed", "inflammation"],
  morningStiffness: ["stiffness", "stiff", "morning", "woke up", "getting up"],
  medicationAdherence: ["medication", "meds", "pill", "dose", "took", "missed", "forgot"],
};

// No API call — runs on every interim transcript, instant.
export function optimisticHighlight(transcript: string): MetricKey[] {
  const lower = transcript.toLowerCase();
  return (Object.entries(METRIC_KEYWORDS) as [MetricKey, string[]][])
    .filter(([, kws]) => kws.some((kw) => lower.includes(kw)))
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

  const reset = useCallback(() => setState({ optimistic: [], confirmed: [], missing: [] }), []);

  return { state, scanInterim, applyConfirmed, reset };
}
