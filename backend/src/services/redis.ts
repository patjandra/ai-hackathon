import Redis from "ioredis";

// Support both REDIS_URL and the old REDIS_HOST/PORT/PASSWORD format
function redisConfig() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  if (process.env.REDIS_HOST) {
    const { REDIS_HOST, REDIS_PORT = "6379", REDIS_PASSWORD } = process.env;
    const auth = REDIS_PASSWORD ? `:${REDIS_PASSWORD}@` : "";
    return `redis://${auth}${REDIS_HOST}:${REDIS_PORT}`;
  }
  return "redis://localhost:6379";
}

export const redis = new Redis(redisConfig());

redis.on("error", (err) => console.error("Redis error:", err));

function safeParse(val: string | undefined, fallback: any): any {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch {
    // Comma-separated string (old format) → array
    if (typeof fallback === "object" && Array.isArray(fallback)) {
      return val.split(",").map(s => s.trim()).filter(Boolean);
    }
    return fallback;
  }
}

export async function savePatient(patient: Record<string, string>) {
  await redis.hset(`patient:${patient.id}`, patient);
}

export async function getPatient(patientId: string) {
  return redis.hgetall(`patient:${patientId}`);
}

export async function saveCheckin(checkin: Record<string, any>) {
  const { id, patientId } = checkin;
  const flat = {
    ...checkin,
    metrics: JSON.stringify(checkin.metrics),
    coveredMetrics: JSON.stringify(checkin.coveredMetrics || []),
    missingMetrics: JSON.stringify(checkin.missingMetrics || []),
  };
  await redis.hset(`checkin:${id}`, flat);
  const timestamp = new Date(checkin.date).getTime();
  await redis.zadd(`checkins:${patientId}`, timestamp, id);
}

export async function getCheckinsSince(patientId: string, since: string): Promise<any[]> {
  const timestamp = new Date(since).getTime();
  const ids = await redis.zrangebyscore(`checkins:${patientId}`, timestamp, "+inf");
  const checkins: any[] = [];
  for (const id of ids) {
    const raw = await redis.hgetall(`checkin:${id}`);
    if (raw?.id) {
      checkins.push({
        ...raw,
        metrics: safeParse(raw.metrics, {}),
        coveredMetrics: safeParse(raw.coveredMetrics, []),
        missingMetrics: safeParse(raw.missingMetrics, []),
      });
    }
  }
  return checkins;
}

export async function getCachedSummary(patientId: string) {
  const cached = await redis.get(`summary:${patientId}`);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheSummary(patientId: string, summary: any) {
  await redis.set(`summary:${patientId}`, JSON.stringify(summary), "EX", 3600);
}

export async function clearSummaryCache(patientId: string) {
  await redis.del(`summary:${patientId}`);
}
