import { Router } from "express";
import * as db from "../services/redis";

const router = Router();

router.get("/:patientId", async (req, res) => {
  const patient = await db.getPatient(req.params.patientId);
  if (!patient?.id) return res.status(404).json({ error: "Patient not found" });
  res.json(patient);
});

router.get("/:patientId/checkins", async (req, res) => {
  const { patientId } = req.params;
  const patient = await db.getPatient(patientId);
  if (!patient?.id) return res.status(404).json({ error: "Patient not found" });
  const since = (req.query.since as string) || patient.lastAppointment;
  const checkins = await db.getCheckinsSince(patientId, since);
  res.json(checkins);
});

export default router;
