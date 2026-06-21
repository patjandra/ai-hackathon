/**
 * Anomaly detection — pure application logic, no external agents.
 * Checks a patient's recent check-in history for four trigger conditions
 * and returns a flagged boolean + a specific, data-driven reason string.
 */

import type { CheckIn } from "../../../shared/types.js";

export interface AnomalyResult {
  flagged: boolean;
  reason: string | null;
  checkedAt: string;
}

export function detectAnomalies(checkins: CheckIn[]): AnomalyResult {
  const now = new Date().toISOString();
  if (checkins.length === 0) return { flagged: false, reason: null, checkedAt: now };

  // Sort oldest → newest
  const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date));
  const recent5 = sorted.slice(-5);

  // ── Trigger 1: Pain severity ≥ 8 in any recent check-in ──────────────
  for (const c of recent5) {
    const pain = c.metrics.pain.value;
    if (pain !== null && pain >= 8) {
      // Compute average of all OTHER check-ins for context
      const others = sorted
        .filter((x) => x.id !== c.id)
        .map((x) => x.metrics.pain.value)
        .filter((v): v is number => v !== null);
      const avg = others.length
        ? Math.round(others.reduce((s, v) => s + v, 0) / others.length)
        : null;
      const context = avg !== null ? `, up from a recent average of ${avg}` : "";
      return { flagged: true, reason: `Pain severity spiked to ${pain}/10${context}`, checkedAt: now };
    }
  }

  // ── Trigger 2: Pain rising for 3 or more consecutive check-ins ────────
  const painSeries = sorted
    .map((c) => c.metrics.pain.value)
    .filter((v): v is number => v !== null);

  if (painSeries.length >= 3) {
    let run = 1;
    for (let i = painSeries.length - 1; i > 0; i--) {
      if (painSeries[i] > painSeries[i - 1]) {
        run++;
        if (run >= 3) {
          const from = painSeries[painSeries.length - run];
          const to = painSeries[painSeries.length - 1];
          return {
            flagged: true,
            reason: `Pain rising for ${run} consecutive check-ins (${from} → ${to}/10)`,
            checkedAt: now,
          };
        }
      } else {
        break;
      }
    }
  }

  // ── Trigger 3: Medication non-adherence in 2+ of the last 5 check-ins ─
  const nonAdherent = recent5.filter((c) => {
    const v = (c.metrics.medicationAdherence.value ?? "").toLowerCase();
    return v === "no" || v === "partial";
  });
  if (nonAdherent.length >= 2) {
    return {
      flagged: true,
      reason: `Medication non-adherence flagged in ${nonAdherent.length} of the last ${recent5.length} check-ins`,
      checkedAt: now,
    };
  }

  // ── Trigger 4: New symptom category not seen in prior history ─────────
  if (sorted.length >= 2) {
    const latest = sorted[sorted.length - 1];
    const history = sorted.slice(0, -1);

    // Swelling appearing for the first time (was "none" / null in all prior)
    const latestSwelling = latest.metrics.swelling.value;
    const hadSwelling = history.some(
      (c) => c.metrics.swelling.value && c.metrics.swelling.value !== "none",
    );
    if (!hadSwelling && latestSwelling && latestSwelling !== "none") {
      return {
        flagged: true,
        reason: `New symptom reported for first time: swelling (${latestSwelling})`,
        checkedAt: now,
      };
    }

    // New custom tracked finding appearing for the first time
    const latestFindings = latest.trackedFindings ?? {};
    for (const [key, val] of Object.entries(latestFindings)) {
      if (val !== null) {
        const seenBefore = history.some(
          (c) => c.trackedFindings?.[key] !== null && c.trackedFindings?.[key] !== undefined,
        );
        if (!seenBefore) {
          return {
            flagged: true,
            reason: `New tracked parameter reported for first time: ${key}`,
            checkedAt: now,
          };
        }
      }
    }
  }

  return { flagged: false, reason: null, checkedAt: now };
}
