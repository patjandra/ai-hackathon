import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import {
  completeCheckin,
  connectRedis,
  setPatient,
} from "../backend/src/services/redis.js";
import type { CheckIn, MetricKey } from "../shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "demo-data", "rheumatology-patient.json");

const ALL: MetricKey[] = ["pain", "fatigue", "swelling", "morningStiffness", "medicationAdherence"];

interface RawCheckin {
  date: string;
  pain: number;
  fatigue: string;
  swelling: string;
  morningStiffness: number;
  medicationAdherence: string;
  quote: string;
}

export async function seedFromFile(): Promise<{ patientId: string }> {
  await connectRedis();
  const json = JSON.parse(await readFile(DATA, "utf8")) as {
    patient: { id: string; name: string; diagnosis: string; lastAppointment: string; nextAppointment: string };
    checkins: RawCheckin[];
  };

  await setPatient(json.patient);

  for (const r of json.checkins) {
    const checkin: CheckIn = {
      id: randomUUID(),
      patientId: json.patient.id,
      date: new Date(r.date).toISOString(),
      rawTranscript: r.quote,
      metrics: {
        pain: { value: r.pain, confidence: "high", raw: String(r.pain) },
        fatigue: { value: r.fatigue, confidence: "high", raw: r.fatigue },
        swelling: { value: r.swelling, confidence: "high", raw: r.swelling },
        morningStiffness: { value: r.morningStiffness, confidence: "high", raw: `${r.morningStiffness} min` },
        medicationAdherence: { value: r.medicationAdherence, confidence: "high", raw: r.medicationAdherence },
      },
      coveredMetrics: [...ALL],
      missingMetrics: [],
      followUpUsed: false,
      patientQuote: r.quote,
    };
    // Score = the check-in's own timestamp (ms) so range queries return the arc.
    await completeCheckin(checkin, new Date(r.date).getTime());
  }

  return { patientId: json.patient.id };
}
