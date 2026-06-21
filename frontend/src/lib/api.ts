import type { Patient, PhysicianSummary, CheckIn } from "./types";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function json<T>(resPromise: Promise<Response>): Promise<T> {
  const res = await resPromise;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  submitCheckin(patientId: string, transcript: string) {
    return json<{ checkinId: string; coveredMetrics: string[]; missingMetrics: string[]; followUpQuestion: string | null }>(
      fetch(`${BASE}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, transcript }),
      })
    );
  },

  submitFollowup(checkinId: string, transcript: string) {
    return json<{ coveredMetrics: string[]; missingMetrics: string[]; followUpQuestion: string | null }>(
      fetch(`${BASE}/checkin/${checkinId}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })
    );
  },

  completeCheckin(checkinId: string) {
    return json<{ saved: boolean }>(
      fetch(`${BASE}/checkin/${checkinId}/complete`, { method: "POST" })
    );
  },

  getPatient(patientId: string) {
    return json<Patient>(fetch(`${BASE}/patient/${patientId}`));
  },

  getCheckins(patientId: string) {
    return json<CheckIn[]>(fetch(`${BASE}/patient/${patientId}/checkins`));
  },

  getSummary(patientId: string) {
    return json<PhysicianSummary>(fetch(`${BASE}/summary/${patientId}`));
  },

  seedDemo() {
    return json<{ patientId: string; dashboardUrl: string }>(
      fetch(`${BASE}/demo/seed`, { method: "POST" })
    );
  },
};
