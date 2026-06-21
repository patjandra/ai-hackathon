import { Router } from "express";
import * as claude from "../services/claude";
import * as db from "../services/redis";

const router = Router();

router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  try {
    const cached = await db.getCachedSummary(patientId);
    if (cached) return res.json(cached);

    const patient = await db.getPatient(patientId);
    if (!patient?.id) return res.status(404).json({ error: "Patient not found" });

    const checkins = await db.getCheckinsSince(patientId, patient.lastAppointment);
    if (!checkins.length) return res.status(404).json({ error: "No check-ins found since last appointment" });

    const summary = await claude.generateSummary(JSON.stringify(checkins, null, 2));
    summary.patientId = patientId;
    summary.generatedAt = new Date().toISOString();
    summary.checkInCount = checkins.length;
    // Use actual last check-in date, not today — avoids a misleading "Oct 2025 → Jun 2026" span
    summary.dateRange = { from: checkins[0].date, to: checkins[checkins.length - 1].date };

    await db.cacheSummary(patientId, summary);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
