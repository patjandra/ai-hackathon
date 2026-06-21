export type InterimStatus = "ready" | "needs-review" | "no-interim" | "no-checkins";

export interface DemoPatient {
  id: string;
  name: string;
  dob: string;          // YYYY-MM-DD
  condition: string;
  nextVisit: string;    // YYYY-MM-DD
  checkInCount: number;
  lastCheckIn: string | null;         // ISO datetime
  interimGeneratedAt: string | null;  // ISO datetime
  status: InterimStatus;
  newCheckInsSinceInterim?: number;
  // Anomaly flag — seeded for demo; overridden by real API data when available
  alertFlagged?: boolean;
  alertReason?: string;
}

export const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: "demo-sarah-chen-ra",
    name: "Kelley Liang",
    dob: "1987-01-14",
    condition: "Rheumatoid Arthritis",
    nextVisit: "2025-11-14",
    checkInCount: 12,
    lastCheckIn: "2025-11-13T10:00:00Z",
    interimGeneratedAt: "2025-11-13T14:00:00Z",
    status: "ready",
    alertFlagged: true,
    alertReason: "Pain severity spiked to 8/10, up from a recent average of 4",
  },
  {
    id: "michael-lee-cp",
    name: "Preston A Tjandra",
    dob: "1994-06-07",
    condition: "Chronic Pain",
    nextVisit: "2025-12-04",
    checkInCount: 9,
    lastCheckIn: "2025-11-20T14:00:00Z",
    interimGeneratedAt: "2025-11-17T09:00:00Z",
    status: "needs-review",
    newCheckInsSinceInterim: 3,
    alertFlagged: true,
    alertReason: "Medication non-adherence flagged in 2 of the last 5 check-ins",
  },
  {
    id: "ava-patel-ms",
    name: "Carly Chan",
    dob: "1978-08-09",
    condition: "Multiple Sclerosis",
    nextVisit: "2026-01-08",
    checkInCount: 8,
    lastCheckIn: "2025-11-18T08:00:00Z",
    interimGeneratedAt: null,
    status: "no-interim",
  },
  {
    id: "kat-bernabe-surgery",
    name: "Kat Bernabe",
    dob: "1991-09-15",
    condition: "Post Surgery Recovery",
    nextVisit: "2026-01-22",
    checkInCount: 6,
    lastCheckIn: "2025-12-02T09:00:00Z",
    interimGeneratedAt: null,
    status: "no-interim",
  },
  {
    id: "daniel-kim-migraine",
    name: "Rohit Raman",
    dob: "1969-05-21",
    condition: "Migraine Tracking",
    nextVisit: "2026-01-15",
    checkInCount: 0,
    lastCheckIn: null,
    interimGeneratedAt: null,
    status: "no-checkins",
  },
];

export function getPatient(id: string): DemoPatient | undefined {
  return DEMO_PATIENTS.find((p) => p.id === id);
}
