import { Router } from "express";
import {
  getAlert,
  getCheckinsSince,
  getFullTrackedParams,
  getPatient,
  setAlert,
  setTrackedParams,
} from "../services/redis.js";
import { detectAnomalies } from "../services/anomaly.js";

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

// GET /api/patient/:patientId/anomaly
// Computes + caches anomaly check on demand (also runs automatically post-complete).
router.get("/:patientId/anomaly", async (req, res) => {
  const { patientId } = req.params;
  try {
    // Return cached result if available
    const cached = await getAlert(patientId);
    if (cached) return res.json(cached);

    // Otherwise compute fresh and cache it
    const patient = await getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "patient_not_found" });
    const sinceMs = Date.parse(patient.lastAppointment);
    const history = await getCheckinsSince(patientId, sinceMs);
    const result = detectAnomalies(history);
    await setAlert(patientId, result);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "anomaly_check_failed" });
  }
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
