import { Router } from "express";
import { getCheckinsSince, getPatient } from "../services/redis.js";

const router = Router();

// GET /api/patient/:patientId
router.get("/:patientId", async (req, res) => {
  const patient = await getPatient(req.params.patientId);
  if (!patient) return res.status(404).json({ error: "patient_not_found" });
  res.json(patient);
});

// GET /api/patient/:patientId/checkins?since=ISODate
// Raw numeric series for the pain chart + timeline (plan issue D).
router.get("/:patientId/checkins", async (req, res) => {
  const { patientId } = req.params;
  const since = req.query.since as string | undefined;
  const patient = await getPatient(patientId);
  if (!patient) return res.status(404).json({ error: "patient_not_found" });
  const sinceMs = Date.parse(since ?? patient.lastAppointment);
  const checkins = await getCheckinsSince(patientId, sinceMs);
  res.json(checkins);
});

export default router;
