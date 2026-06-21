import { Router } from "express";
import { v4 as uuid } from "uuid";
import * as claude from "../services/claude";
import * as db from "../services/redis";

const router = Router();

// In-memory store for check-ins that haven't been committed yet
const pending = new Map<string, any>();

router.post("/", async (req, res) => {
  const { patientId, transcript } = req.body;
  if (!patientId || !transcript?.trim()) {
    return res.status(400).json({ error: "patientId and transcript required" });
  }
  try {
    const extraction = await claude.processCheckin(transcript);
    const checkinId = uuid();
    pending.set(checkinId, {
      id: checkinId,
      patientId,
      date: new Date().toISOString().slice(0, 10),
      rawTranscript: transcript,
      metrics: extraction.metrics,
      coveredMetrics: extraction.coveredMetrics || [],
      missingMetrics: extraction.missingMetrics || [],
      patientQuote: extraction.patientQuote,
      followUpUsed: false,
    });
    res.json({
      checkinId,
      metrics: extraction.metrics,
      coveredMetrics: extraction.coveredMetrics || [],
      missingMetrics: extraction.missingMetrics || [],
      followUpQuestion: extraction.followUpQuestion,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/:checkinId/followup", async (req, res) => {
  const { checkinId } = req.params;
  const { transcript } = req.body;
  const entry = pending.get(checkinId);
  if (!entry) return res.status(404).json({ error: "Check-in session not found" });

  try {
    const extraction = await claude.processCheckin(transcript);

    // Merge: don't overwrite already-confirmed values
    const merged = { ...entry.metrics };
    for (const [key, val] of Object.entries(extraction.metrics) as [string, any][]) {
      if (val?.value !== null && val?.value !== undefined) {
        if (merged[key]?.value === null || merged[key]?.value === undefined) {
          merged[key] = val;
        }
      }
    }

    const ALL = ["pain", "fatigue", "swelling", "morning_stiffness", "medication_adherence"];
    const covered = ALL.filter(k => merged[k]?.value !== null && merged[k]?.value !== undefined);
    const missing = ALL.filter(k => !covered.includes(k));

    entry.metrics = merged;
    entry.coveredMetrics = covered;
    entry.missingMetrics = missing;
    entry.followUpUsed = true;
    if (extraction.patientQuote && !entry.patientQuote) {
      entry.patientQuote = extraction.patientQuote;
    }
    pending.set(checkinId, entry);

    res.json({
      updatedMetrics: merged,
      coveredMetrics: covered,
      missingMetrics: missing,
      followUpQuestion: extraction.followUpQuestion,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/:checkinId/complete", async (req, res) => {
  const { checkinId } = req.params;
  const entry = pending.get(checkinId);
  if (!entry) return res.status(404).json({ error: "Check-in session not found" });
  try {
    await db.saveCheckin(entry);
    await db.clearSummaryCache(entry.patientId);
    pending.delete(checkinId);
    res.json({ checkinId, saved: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
