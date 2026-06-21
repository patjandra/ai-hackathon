import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Single source of env loading. Lives in the backend package so `dotenv`
// resolves from backend/node_modules, and reads the ONE root .env regardless of
// the process's cwd. Import this before anything that reads process.env
// (e.g. redis.ts / claude.ts create clients at module load).
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../.env") });
