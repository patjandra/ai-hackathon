import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

// Single source of env loading. Reads the ONE root .env regardless of cwd or how
// the file is executed (tsx, node, compiled). We probe a few candidate locations
// and load the first that exists, so a path quirk never silently leaves
// process.env empty (which would crash Redis/Arize at startup).
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, "../../.env"), // backend/src -> repo root
  join(here, "../.env"), // backend (compiled dist) -> repo root
  join(process.cwd(), "../.env"), // cwd = backend -> repo root
  join(process.cwd(), ".env"), // cwd = repo root
];

const envPath = candidates.find((p) => existsSync(p));
const result = dotenv.config(envPath ? { path: envPath } : undefined);

if (result.error || !process.env.REDIS_URL) {
  console.warn("[env] could not load a usable .env. Tried:\n  " + candidates.join("\n  "));
} else {
  console.log(`[env] loaded ${envPath}`);
}
