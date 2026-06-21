import { Router } from "express";
import { callText, parseJsonResponse, SUMMARY_MODEL } from "../services/claude.js";
import { formatCheckinHistory, summaryPrompt } from "../prompts/summary.js";
import {
  cacheSummary,
  clearSummaryCache,
  getCachedSummary,
  getCheckinsSince,
  getPatient,
} from "../services/redis.js";
import type { PhysicianSummary, Trajectory } from "../../../shared/types.js";

const router = Router();

// The model occasionally drifts off the enum (e.g. "IMPROVING_WITH_PLATEAU").
// Coerce to exactly one of the three allowed values so the UI never crashes.
function normalizeTrajectory(t: unknown): Trajectory {
  const u = String(t ?? "").toUpperCase();
  if (u.includes("DECLIN") || u.includes("WORSE")) return "DECLINING";
  if (u.includes("IMPROV") || u.includes("BETTER")) return "IMPROVING";
  return "STABLE";
}

// DELETE /api/summary/:patientId — clear cache so next GET forces regeneration
router.delete("/:patientId", async (req, res) => {
  await clearSummaryCache(req.params.patientId).catch(() => {});
  res.json({ cleared: true });
});

// GET /api/summary/:patientId  (?force=1 bypasses cache)
router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  const force = req.query.force === "1";
  try {
    const cached = !force ? await getCachedSummary(patientId) : null;
    if (cached) return res.json(cached);

    const patient = await getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "patient_not_found" });

    const sinceMs = Date.parse(patient.lastAppointment);
    const checkins = await getCheckinsSince(patientId, sinceMs);
    if (checkins.length === 0) return res.status(404).json({ error: "no_checkins" });

    const history = formatCheckinHistory(checkins);
    const text = await callText(
      SUMMARY_MODEL,
      summaryPrompt(history, checkins.length, patient.lastAppointment),
      1500,
    );
    const parsed = parseJsonResponse<Partial<PhysicianSummary>>(text);

    const summary: PhysicianSummary = {
      patientId,
      generatedAt: new Date().toISOString(),
      dateRange: { from: checkins[0].date, to: checkins[checkins.length - 1].date },
      checkInCount: checkins.length,
      whyThisVisitMatters: {
        trajectory: normalizeTrajectory(parsed.whyThisVisitMatters?.trajectory),
        focusAreas: parsed.whyThisVisitMatters?.focusAreas ?? [],
      },
      assessment: parsed.assessment!,
      keyEvents: parsed.keyEvents ?? [],
      metricSummary: parsed.metricSummary!,
      patientQuote: parsed.patientQuote!,
      patientQuoteDate: parsed.patientQuoteDate!,
    };
    await cacheSummary(patientId, summary);
    res.json(summary);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "summary_failed" });
  }
});

export default router;
