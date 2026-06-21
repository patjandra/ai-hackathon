import type {
  CheckIn,
  CheckInResponse,
  CompleteResponse,
  Patient,
  PhysicianSummary,
} from "../../../shared/types";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? "ws://localhost:3001";
export const DEMO_PATIENT_ID = import.meta.env.VITE_DEMO_PATIENT_ID ?? "demo-sarah-chen-ra";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  checkin: (patientId: string, transcript: string) =>
    fetch(`${API}/api/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, transcript }),
    }).then((r) => j<CheckInResponse>(r)),

  followup: (checkinId: string, transcript: string, context?: string) =>
    fetch(`${API}/api/checkin/${checkinId}/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, context }),
    }).then((r) => j<Omit<CheckInResponse, "checkinId" | "metrics"> & { updatedMetrics: CheckInResponse["metrics"] }>(r)),

  complete: (checkinId: string) =>
    fetch(`${API}/api/checkin/${checkinId}/complete`, { method: "POST" }).then((r) => j<CompleteResponse>(r)),

  patient: (patientId: string) => fetch(`${API}/api/patient/${patientId}`).then((r) => j<Patient>(r)),

  checkins: (patientId: string) =>
    fetch(`${API}/api/patient/${patientId}/checkins`).then((r) => j<CheckIn[]>(r)),

  summary: (patientId: string) => fetch(`${API}/api/summary/${patientId}`).then((r) => j<PhysicianSummary>(r)),

  seed: () => fetch(`${API}/api/demo/seed`, { method: "POST" }).then((r) => j<{ patientId: string; dashboardUrl: string }>(r)),

  getTrackedParams: (patientId: string) =>
    fetch(`${API}/api/patient/${patientId}/parameters`).then((r) =>
      j<{ patientId: string; parameters: string[]; assignedBy: string | null; assignedAt: string | null }>(r),
    ),

  setTrackedParams: (patientId: string, parameters: string[]) =>
    fetch(`${API}/api/patient/${patientId}/parameters`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parameters }),
    }).then((r) => j<{ saved: boolean; parameters: string[] }>(r)),
};
