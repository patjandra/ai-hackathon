// Usage: from backend/ run `npm run seed`  (or: npx tsx scripts/seed.ts)
import "../backend/src/env.js"; // loads root .env (dotenv resolves from backend/)
import { seedFromFile } from "./seedLib.js";
import { redis } from "../backend/src/services/redis.js";

const { patientId } = await seedFromFile();
console.log(`Seeded patient ${patientId} with 12 check-ins.`);
await redis.quit();
