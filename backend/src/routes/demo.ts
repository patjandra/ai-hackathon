import { Router } from "express";
import { v4 as uuid } from "uuid";
import * as db from "../services/redis";
import demoData from "../../../demo-data/rheumatology-patient.json";

const router = Router();

router.post("/seed", async (req, res) => {
  try {
    const { patient, checkins } = demoData;

    // Save patient
    await db.savePatient({
      id: patient.id,
      name: patient.name,
      diagnosis: patient.diagnosis,
      lastAppointment: patient.lastAppointment,
      nextAppointment: patient.nextAppointment,
    });

    // Clear old check-ins and summary cache
    const existingIds = await db.redis.zrange(`checkins:${patient.id}`, 0, -1);
    for (const id of existingIds) await db.redis.del(`checkin:${id}`);
    await db.redis.del(`checkins:${patient.id}`);
    await db.clearSummaryCache(patient.id);

    // Save each check-in
    for (const c of checkins) {
      await db.saveCheckin({
        id: uuid(),
        patientId: patient.id,
        date: c.date,
        rawTranscript: c.quote,
        patientQuote: c.quote,
        followUpUsed: false,
        metrics: {
          pain: { value: c.pain, confidence: "high", raw: null },
          fatigue: { value: c.fatigue, confidence: "high", raw: null },
          swelling: { value: c.swelling, confidence: "high", raw: null },
          morning_stiffness: { value: c.morningStiffness, confidence: "high", raw: null },
          medication_adherence: { value: c.medicationAdherence, confidence: "high", raw: null },
        },
        coveredMetrics: ["pain", "fatigue", "swelling", "morning_stiffness", "medication_adherence"],
        missingMetrics: [],
      });
    }

    res.json({
      patientId: patient.id,
      checkinsSeeded: checkins.length,
      dashboardUrl: `/doctor/${patient.id}`,
      patientUrl: `/patient/${patient.id}`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
