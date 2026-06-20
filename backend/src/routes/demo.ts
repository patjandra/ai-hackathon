import { Router } from "express";
import { seedFromFile } from "../../../scripts/seedLib.js";

const router = Router();

// POST /api/demo/seed — (re)load Sarah Chen + 12 check-ins into Redis.
router.post("/seed", async (_req, res) => {
  try {
    const { patientId } = await seedFromFile();
    const base = process.env.FRONTEND_URL ?? "http://localhost:5173";
    res.json({ patientId, dashboardUrl: `${base}/doctor/${patientId}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "seed_failed" });
  }
});

export default router;
