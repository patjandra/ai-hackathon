import "../src/env.js";
import { DEMO_PATIENTS } from "../../frontend/src/lib/patients.js";
import { connectRedis, getPatient, redis, setPatient } from "../src/services/redis.js";

await connectRedis();

let created = 0;
let skipped = 0;

for (const patient of DEMO_PATIENTS) {
  if (await getPatient(patient.id)) {
    skipped += 1;
    continue;
  }

  await setPatient({
    id: patient.id,
    name: patient.name,
    dob: patient.dob,
    diagnosis: patient.condition,
    // Directory-only examples do not carry an appointment history. Use the
    // beginning of the demo year so future check-ins are included in summaries.
    lastAppointment: "2026-01-01",
    nextAppointment: patient.nextVisit,
  });
  created += 1;
}

console.log(`Directory seed complete: ${created} created, ${skipped} already present.`);
await redis.quit();
