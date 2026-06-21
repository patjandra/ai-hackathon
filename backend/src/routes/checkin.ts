import { Router } from "express";
import { randomUUID } from "crypto";
import { callText, EXTRACTION_MODEL, parseJsonResponse } from "../services/claude.js";
import { combinedPrompt, type CombinedResult } from "../prompts/combined.js";
import {
  completeCheckin,
  getAlert,
  getCheckin,
  getCheckinsSince,
  getPatient,
  getTrackedParams,
  saveInProgress,
  setAlert,
} from "../services/redis.js";
import { detectAnomalies } from "../services/anomaly.js";
import type { CheckIn, CheckInMetrics, MetricKey } from "../../../shared/types.js";

const router = Router();

function toMetrics(r: CombinedResult): CheckInMetrics {
  const c = (x: any) => (x?.confidence ?? null) as any;
  return {
    pain:                 { value: r.metrics.pain.value,                 confidence: c(r.metrics.pain),                 raw: r.metrics.pain.raw                 },
    fatigue:              { value: r.metrics.fatigue.value,              confidence: c(r.metrics.fatigue),              raw: r.metrics.fatigue.raw              },
    swelling:             { value: r.metrics.swelling.value,             confidence: c(r.metrics.swelling),             raw: r.metrics.swelling.raw             },
    morningStiffness:     { value: r.metrics.morning_stiffness.value,    confidence: c(r.metrics.morning_stiffness),    raw: r.metrics.morning_stiffness.raw    },
    medicationAdherence:  { value: r.metrics.medication_adherence.value, confidence: c(r.metrics.medication_adherence), raw: r.metrics.medication_adherence.raw },
  };
}

const ALL: MetricKey[] = ["pain", "fatigue", "swelling", "morningStiffness", "medicationAdherence"];
const coveredOf = (m: CheckInMetrics) => ALL.filter((k) => m[k].value !== null && m[k].value !== "");
const missingOf = (m: CheckInMetrics) => ALL.filter((k) => m[k].value === null || m[k].value === "");

const SNAKE_TO_KEY: Record<string, MetricKey> = {
  pain: "pain",
  fatigue: "fatigue",
  swelling: "swelling",
  morning_stiffness: "morningStiffness",
  medication_adherence: "medicationAdherence",
};

// Metrics the patient touched on but left unclear, restricted to those still
// missing. `missing` is priority-ordered, so the result is too.
function ambiguousOf(result: CombinedResult, missing: MetricKey[]): MetricKey[] {
  const flagged = new Set(
    (result.ambiguousMetrics ?? []).map((s) => SNAKE_TO_KEY[s]).filter(Boolean),
  );
  return missing.filter((k) => flagged.has(k));
}

async function extract(transcript: string, trackedParams: string[], context = ""): Promise<CombinedResult> {
  const text = await callText(EXTRACTION_MODEL, combinedPrompt(transcript, trackedParams, context), 1000);
  return parseJsonResponse<CombinedResult>(text);
}

function mergeMetrics(prev: CheckInMetrics, next: CheckInMetrics): CheckInMetrics {
  const out = { ...prev };
  for (const k of ALL) {
    const nv = next[k].value;
    if (nv !== null && nv !== "") out[k] = next[k] as any;
  }
  return out;
}

function mergeTrackedFindings(
  prev: Record<string, string | null> | undefined,
  next: Record<string, string | null>,
): Record<string, string | null> {
  const merged = { ...(prev ?? {}), ...next };
  // Don't overwrite an already-confirmed value with null
  for (const [k, v] of Object.entries(prev ?? {})) {
    if (v !== null && next[k] === null) merged[k] = v;
  }
  return merged;
}

// POST /api/checkin  { patientId, transcript }
router.post("/", async (req, res) => {
  try {
    const { patientId, transcript } = req.body as { patientId: string; transcript: string };
    const trackedParams = await getTrackedParams(patientId);
    const result = await extract(transcript, trackedParams);
    const metrics = toMetrics(result);
    const checkin: CheckIn = {
      id: randomUUID(),
      patientId,
      date: new Date().toISOString(),
      rawTranscript: transcript,
      metrics,
      coveredMetrics: coveredOf(metrics),
      missingMetrics: missingOf(metrics),
      followUpUsed: false,
      patientQuote: result.patientQuote,
      trackedFindings: result.trackedFindings ?? {},
    };
    await saveInProgress(checkin);
    res.json({
      checkinId: checkin.id,
      metrics,
      coveredMetrics: checkin.coveredMetrics,
      missingMetrics: checkin.missingMetrics,
      ambiguousMetrics: ambiguousOf(result, checkin.missingMetrics),
      followUpQuestion: checkin.missingMetrics.length ? result.followUpQuestion : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "extraction_failed" });
  }
});

// POST /api/checkin/:id/followup  { transcript }
router.post("/:id/followup", async (req, res) => {
  try {
    const existing = await getCheckin(req.params.id);
    if (!existing) return res.status(404).json({ error: "checkin_not_found" });
    const { transcript, context } = req.body as { transcript: string; context?: string };
    const trackedParams = await getTrackedParams(existing.patientId);
    const result = await extract(transcript, trackedParams, context ?? "");
    const merged = mergeMetrics(existing.metrics, toMetrics(result));
    existing.metrics = merged;
    existing.coveredMetrics = coveredOf(merged);
    existing.missingMetrics = missingOf(merged);
    existing.followUpUsed = true;
    existing.rawTranscript += `\n${transcript}`;
    existing.trackedFindings = mergeTrackedFindings(existing.trackedFindings, result.trackedFindings ?? {});
    if (result.patientQuote && !existing.patientQuote) existing.patientQuote = result.patientQuote;
    await saveInProgress(existing);
    res.json({
      updatedMetrics: merged,
      coveredMetrics: existing.coveredMetrics,
      missingMetrics: existing.missingMetrics,
      ambiguousMetrics: ambiguousOf(result, existing.missingMetrics),
      followUpQuestion: existing.missingMetrics.length ? result.followUpQuestion : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "followup_failed" });
  }
});

// POST /api/checkin/:id/complete
router.post("/:id/complete", async (req, res) => {
  const existing = await getCheckin(req.params.id);
  if (!existing) return res.status(404).json({ error: "checkin_not_found" });
  await completeCheckin(existing, Date.parse(existing.date));

  // Run anomaly detection after saving and store the result non-blocking
  (async () => {
    try {
      const patient = await getPatient(existing.patientId);
      if (patient) {
        const sinceMs = Date.parse(patient.lastAppointment);
        const history = await getCheckinsSince(existing.patientId, sinceMs);
        const result = detectAnomalies(history);
        await setAlert(existing.patientId, result);
      }
    } catch (e) {
      console.error("[anomaly]", e);
    }
  })();

  res.json({ checkinId: existing.id, saved: true });
});

export default router;
