import { createClient } from "redis";
import type {
  CheckIn,
  CheckInMetrics,
  MetricKey,
  Patient,
  PhysicianSummary,
} from "../../../shared/types.js";

// node-redis v4 (camelCase API: zAdd / zRangeByScore). All timestamps are ms.

export const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (e) => console.error("[redis]", e));

export async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}

// ----- Keys -----
const kPatient = (id: string) => `patient:${id}`;
const kCheckins = (id: string) => `checkins:${id}`;
const kCheckin = (id: string) => `checkin:${id}`;
const kSummary = (id: string) => `summary:${id}`;
const kParams = (id: string) => `params:${id}`;
const kPatientIdentity = "patients:by-identity";
const kPatients = "patients:all";

const IN_PROGRESS_TTL = 60 * 60; // 1h — covers a check-in + its follow-up turn

// ----- Flatten / unflatten (plan LOW note: one helper, both paths) -----
export function flattenCheckin(c: CheckIn): Record<string, string> {
  const m = c.metrics;
  return {
    id: c.id,
    patientId: c.patientId,
    date: c.date,
    rawTranscript: c.rawTranscript,
    pain_value: String(m.pain.value ?? ""),
    pain_confidence: m.pain.confidence ?? "",
    pain_raw: m.pain.raw ?? "",
    fatigue_value: m.fatigue.value ?? "",
    swelling_value: m.swelling.value ?? "",
    morningStiffness_value: String(m.morningStiffness.value ?? ""),
    medicationAdherence_value: m.medicationAdherence.value ?? "",
    coveredMetrics: c.coveredMetrics.join(","),
    missingMetrics: c.missingMetrics.join(","),
    followUpUsed: String(c.followUpUsed),
    patientQuote: c.patientQuote ?? "",
    trackedParameters: c.trackedParameters ? JSON.stringify(c.trackedParameters) : "",
    trackedFindings: c.trackedFindings ? JSON.stringify(c.trackedFindings) : "",
  };
}

export function unflattenCheckin(h: Record<string, string>): CheckIn {
  const num = (v: string) => (v === "" ? null : Number(v));
  const str = (v: string) => (v === "" ? null : v);
  const metrics: CheckInMetrics = {
    pain: { value: num(h.pain_value), confidence: (str(h.pain_confidence) as any), raw: str(h.pain_raw) },
    fatigue: { value: str(h.fatigue_value), confidence: null, raw: null },
    swelling: { value: str(h.swelling_value), confidence: null, raw: null },
    morningStiffness: { value: num(h.morningStiffness_value), confidence: null, raw: null },
    medicationAdherence: { value: str(h.medicationAdherence_value), confidence: null, raw: null },
  };
  return {
    id: h.id,
    patientId: h.patientId,
    date: h.date,
    rawTranscript: h.rawTranscript ?? "",
    metrics,
    coveredMetrics: (h.coveredMetrics ? h.coveredMetrics.split(",") : []) as MetricKey[],
    missingMetrics: (h.missingMetrics ? h.missingMetrics.split(",") : []) as MetricKey[],
    followUpUsed: h.followUpUsed === "true",
    patientQuote: str(h.patientQuote),
    trackedParameters: h.trackedParameters ? JSON.parse(h.trackedParameters) : undefined,
    trackedFindings: h.trackedFindings ? JSON.parse(h.trackedFindings) : undefined,
  };
}

// ----- Patient -----
export async function setPatient(p: Patient) {
  const multi = redis.multi();
  multi.hSet(kPatient(p.id), {
    name: p.name,
    dob: p.dob,
    diagnosis: p.diagnosis,
    lastAppointment: p.lastAppointment,
    nextAppointment: p.nextAppointment,
  });
  multi.hSet(kPatientIdentity, normalizeIdentity(p.name, p.dob), p.id);
  multi.sAdd(kPatients, p.id);
  await multi.exec();
}

export async function getPatient(id: string): Promise<Patient | null> {
  const h = await redis.hGetAll(kPatient(id));
  if (!h || !h.name) return null;
  return {
    id,
    name: h.name,
    dob: h.dob,
    diagnosis: h.diagnosis,
    lastAppointment: h.lastAppointment,
    nextAppointment: h.nextAppointment,
  };
}

export async function getPatients(): Promise<Patient[]> {
  const ids = await redis.sMembers(kPatients);
  const patients = await Promise.all(ids.map((id) => getPatient(id)));
  return patients.filter((patient): patient is Patient => patient !== null);
}

function normalizeIdentity(name: string, dob: string): string {
  const normalizedName = name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
  return `${normalizedName}|${dob.trim()}`;
}

export async function findPatientByIdentity(name: string, dob: string): Promise<Patient | null> {
  const id = await redis.hGet(kPatientIdentity, normalizeIdentity(name, dob));
  if (!id) return null;
  return getPatient(id);
}

// ----- Check-ins -----
// In-progress (plan issue C): write immediately with TTL, promote on complete.
export async function saveInProgress(c: CheckIn) {
  await redis.hSet(kCheckin(c.id), flattenCheckin(c));
  await redis.expire(kCheckin(c.id), IN_PROGRESS_TTL);
}

export async function getCheckin(id: string): Promise<CheckIn | null> {
  const h = await redis.hGetAll(kCheckin(id));
  if (!h || !h.id) return null;
  return unflattenCheckin(h);
}

// Wipe a patient's check-ins + cached summary so re-seeding is idempotent.
export async function clearPatientCheckins(patientId: string) {
  const ids = await redis.zRange(kCheckins(patientId), 0, -1);
  const multi = redis.multi();
  for (const id of ids) multi.del(kCheckin(id));
  multi.del(kCheckins(patientId));
  multi.del(kSummary(patientId));
  await multi.exec();
}

export async function completeCheckin(c: CheckIn, ts: number) {
  await redis.hSet(kCheckin(c.id), flattenCheckin(c));
  await redis.persist(kCheckin(c.id)); // drop the in-progress TTL
  await redis.zAdd(kCheckins(c.patientId), { score: ts, value: c.id });
  await redis.del(kSummary(c.patientId)); // invalidate cached summary
}

export async function getCheckinsSince(patientId: string, sinceMs: number): Promise<CheckIn[]> {
  const ids = await redis.zRangeByScore(kCheckins(patientId), sinceMs, "+inf");
  const out: CheckIn[] = [];
  for (const id of ids) {
    const c = await getCheckin(id);
    if (c) out.push(c);
  }
  return out;
}

// ----- Summary cache -----
export async function getCachedSummary(patientId: string): Promise<PhysicianSummary | null> {
  const s = await redis.get(kSummary(patientId));
  return s ? (JSON.parse(s) as PhysicianSummary) : null;
}

export async function cacheSummary(patientId: string, summary: PhysicianSummary) {
  await redis.set(kSummary(patientId), JSON.stringify(summary), { EX: 3600 });
}

export async function clearSummaryCache(patientId: string) {
  await redis.del(kSummary(patientId));
}

// ----- Anomaly flag -----
const kAlert = (id: string) => `alert:${id}`;

export async function getAlert(patientId: string) {
  const raw = await redis.get(kAlert(patientId));
  return raw
    ? (JSON.parse(raw) as { flagged: boolean; reason: string | null; checkedAt: string })
    : null;
}

export async function setAlert(
  patientId: string,
  result: { flagged: boolean; reason: string | null; checkedAt: string },
) {
  await redis.set(kAlert(patientId), JSON.stringify(result));
}

// ----- Tracked parameters -----
const DEFAULT_PARAMS = ["Pain", "Fatigue", "Sleep quality", "Mood", "Medication adherence"];

export async function getTrackedParams(patientId: string): Promise<string[]> {
  const raw = await redis.get(kParams(patientId));
  if (!raw) return DEFAULT_PARAMS;
  try {
    const data = JSON.parse(raw);
    return data.parameters ?? DEFAULT_PARAMS;
  } catch {
    return DEFAULT_PARAMS;
  }
}

export async function setTrackedParams(
  patientId: string,
  parameters: string[],
  assignedBy = "doctor",
): Promise<void> {
  await redis.set(
    kParams(patientId),
    JSON.stringify({ patientId, parameters, assignedBy, assignedAt: new Date().toISOString() }),
  );
}

export async function getFullTrackedParams(patientId: string) {
  const raw = await redis.get(kParams(patientId));
  if (!raw) return { patientId, parameters: DEFAULT_PARAMS, assignedBy: null, assignedAt: null };
  return JSON.parse(raw);
}
