import { Router } from "express";
import { getCheckinsSince, getFullTrackedParams, getPatient, setTrackedParams } from "../services/redis.js";

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

// GET /api/patient/:patientId/parameters
router.get("/:patientId/parameters", async (req, res) => {
  const data = await getFullTrackedParams(req.params.patientId);
  res.json(data);
});

// PUT /api/patient/:patientId/parameters  { parameters: string[] }
router.put("/:patientId/parameters", async (req, res) => {
  const { parameters } = req.body as { parameters: string[] };
  if (!Array.isArray(parameters)) return res.status(400).json({ error: "parameters must be an array" });
  await setTrackedParams(req.params.patientId, parameters);
  res.json({ saved: true, parameters });
});

export default router;
