import { Router } from "express";
import { callText, parseJsonResponse, SUMMARY_MODEL } from "../services/claude.js";
import { formatCheckinHistory, summaryPrompt } from "../prompts/summary.js";
import {
  cacheSummary,
  getCachedSummary,
  getCheckinsSince,
  getPatient,
} from "../services/redis.js";
import type { PhysicianSummary } from "../../../shared/types.js";

const router = Router();

// GET /api/summary/:patientId
router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  try {
    const cached = await getCachedSummary(patientId);
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
      whyThisVisitMatters: parsed.whyThisVisitMatters!,
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
