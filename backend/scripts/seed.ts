import Redis from "ioredis";
import { v4 as uuid } from "uuid";
import demoData from "../../demo-data/rheumatology-patient.json";

const redis = new Redis(process.env.REDIS_URL!);

async function seed() {
  const { patient, checkins } = demoData;
  console.log(`Seeding ${patient.name} (${checkins.length} check-ins)...`);

  await redis.hset(`patient:${patient.id}`, {
    id: patient.id,
    name: patient.name,
    diagnosis: patient.diagnosis,
    lastAppointment: patient.lastAppointment,
    nextAppointment: patient.nextAppointment,
  });

  // Clear existing check-ins and summary cache
  const existing = await redis.zrange(`checkins:${patient.id}`, 0, -1);
  for (const id of existing) await redis.del(`checkin:${id}`);
  await redis.del(`checkins:${patient.id}`, `summary:${patient.id}`);

  for (const c of checkins) {
    const id = uuid();
    const ts = new Date(c.date).getTime();
    await redis.hset(`checkin:${id}`, {
      id, patientId: patient.id, date: c.date,
      rawTranscript: c.quote, patientQuote: c.quote, followUpUsed: "false",
      metrics: JSON.stringify({
        pain:                 { value: c.pain,                confidence: "high", raw: null },
        fatigue:              { value: c.fatigue,             confidence: "high", raw: null },
        swelling:             { value: c.swelling,            confidence: "high", raw: null },
        morning_stiffness:    { value: c.morningStiffness,    confidence: "high", raw: null },
        medication_adherence: { value: c.medicationAdherence, confidence: "high", raw: null },
      }),
      coveredMetrics: JSON.stringify(["pain", "fatigue", "swelling", "morning_stiffness", "medication_adherence"]),
      missingMetrics:  JSON.stringify([]),
    });
    await redis.zadd(`checkins:${patient.id}`, ts, id);
    process.stdout.write(".");
  }

  console.log(`\n✓ Done`);
  console.log(`  Dashboard: /doctor/${patient.id}`);
  console.log(`  Patient:   /patient/${patient.id}`);
  redis.disconnect();
}

seed().catch(console.error);
