import { connectRedis, redis, setPatient, clearPatientCheckins } from "../src/services/redis.js";
import { randomUUID } from "crypto";

const PATIENT_ID = "preston-tjandra-cp";

const CHECKINS = [
  { date: "2026-06-02", pain: 5, fatigue: "moderate", swelling: "none", medAdherence: "yes",     quote: "Pain was manageable today, around a 5. Took my meds this morning." },
  { date: "2026-06-04", pain: 6, fatigue: "high",     swelling: "none", medAdherence: "yes",     quote: "Rough day, pain crept up to about a 6. Really fatigued after work." },
  { date: "2026-06-06", pain: 4, fatigue: "moderate", swelling: "none", medAdherence: "yes",     quote: "Feeling a bit better. Pain down to a 4, energy was okay." },
  { date: "2026-06-08", pain: 7, fatigue: "high",     swelling: "mild", medAdherence: "partial", quote: "Forgot my evening dose last night. Pain spiked to a 7, some swelling in my lower back. Sat at my desk too long — that's always a trigger." },
  { date: "2026-06-10", pain: 6, fatigue: "high",     swelling: "mild", medAdherence: "yes",     quote: "Still recovering from Sunday. Pain around 6, swelling slightly better. Took all my meds." },
  { date: "2026-06-12", pain: 5, fatigue: "moderate", swelling: "none", medAdherence: "yes",     quote: "Improved a bit. Went for a short walk which actually helped. Pain is back to 5." },
  { date: "2026-06-14", pain: 4, fatigue: "low",      swelling: "none", medAdherence: "yes",     quote: "Good day. Pain was low, maybe a 4. Energy felt decent for once." },
  { date: "2026-06-16", pain: 6, fatigue: "moderate", swelling: "none", medAdherence: "no",      quote: "Ran out of my prescription, missed a full day of meds. Pain climbed back to 6 by evening. Really need to refill sooner." },
  { date: "2026-06-18", pain: 7, fatigue: "high",     swelling: "mild", medAdherence: "yes",     quote: "Paid for missing meds. Pain at 7, tired all day, some swelling again. Work stress not helping either." },
  { date: "2026-06-20", pain: 6, fatigue: "moderate", swelling: "none", medAdherence: "yes",     quote: "Slightly better. Pain at 6. Took it easy and avoided sitting for long stretches." },
  { date: "2026-06-21", pain: 5, fatigue: "moderate", swelling: "none", medAdherence: "yes",     quote: "Holding steady at 5. Manageable but still noticing flares when work stress peaks." },
];

await connectRedis();

await setPatient({
  id:              PATIENT_ID,
  name:            "Preston A Tjandra",
  diagnosis:       "Chronic Pain",
  lastAppointment: "2026-06-01",
  nextAppointment: "2026-12-04",
});

await clearPatientCheckins(PATIENT_ID);

for (const c of CHECKINS) {
  const id = randomUUID();
  const ts = new Date(c.date).getTime();
  await redis.hSet(`checkin:${id}`, {
    id,
    patientId:              PATIENT_ID,
    date:                   new Date(c.date).toISOString(),
    rawTranscript:          c.quote,
    patientQuote:           c.quote,
    followUpUsed:           "false",
    pain_value:             String(c.pain),
    pain_confidence:        "high",
    pain_raw:               String(c.pain),
    fatigue_value:          c.fatigue,
    swelling_value:         c.swelling,
    morningStiffness_value: "",
    medicationAdherence_value: c.medAdherence,
    coveredMetrics:         JSON.stringify(["pain", "fatigue", "swelling", "medicationAdherence"]),
    missingMetrics:         JSON.stringify(["morningStiffness"]),
    trackedFindings:        "",
  });
  await redis.zAdd(`checkins:${PATIENT_ID}`, { score: ts, value: id });
  process.stdout.write(".");
}

console.log(`\n✓ ${CHECKINS.length} check-ins seeded for ${PATIENT_ID}`);
console.log(`  Profile: /doctor/${PATIENT_ID}`);
await redis.quit();
