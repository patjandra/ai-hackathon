// Usage: from backend/ run `npm run seed`  (or: npx tsx scripts/seed.ts)
import "dotenv/config";
import { seedFromFile } from "./seedLib.js";
import { redis } from "../backend/src/services/redis.js";

const { patientId } = await seedFromFile();
console.log(`Seeded patient ${patientId} with 12 check-ins.`);
await redis.quit();
