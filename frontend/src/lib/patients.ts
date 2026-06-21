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
    id: "preston-tjandra-cp",
    name: "Preston A Tjandra",
    dob: "1994-06-07",
    condition: "Chronic Pain",
    nextVisit: "2026-12-04",
    checkInCount: 11,
    lastCheckIn: "2026-06-21T09:00:00Z",
    interimGeneratedAt: "2026-06-21T09:16:00Z",
    status: "ready",
    alertFlagged: true,
    alertReason: "Medication non-adherence flagged in 2 of the last 11 check-ins",
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

  // ── Generated batch ───────────────────────────────────────────────────────
  { id: "andy-yang",            name: "Andy Yang",            dob: "1988-03-14", condition: "Rheumatoid Arthritis",        nextVisit: "2026-07-15", checkInCount: 11, lastCheckIn: "2026-06-18T09:00:00Z", interimGeneratedAt: "2026-06-18T14:00:00Z", status: "ready" },
  { id: "aneri-sheth",          name: "Aneri Sheth",          dob: "1995-07-22", condition: "Chronic Pain",                nextVisit: "2026-08-04", checkInCount: 9,  lastCheckIn: "2026-06-20T11:00:00Z", interimGeneratedAt: "2026-06-17T10:00:00Z", status: "needs-review", newCheckInsSinceInterim: 3 },
  { id: "anika-giri",           name: "Anika Giri",           dob: "1982-11-05", condition: "Multiple Sclerosis",          nextVisit: "2026-09-12", checkInCount: 7,  lastCheckIn: "2026-06-15T08:00:00Z", interimGeneratedAt: null, status: "no-interim", alertFlagged: true, alertReason: "New symptom reported for first time: significant swelling" },
  { id: "anish-gupta",          name: "Anish Gupta",          dob: "1979-01-30", condition: "Migraine Tracking",           nextVisit: "2026-07-28", checkInCount: 14, lastCheckIn: "2026-06-19T13:00:00Z", interimGeneratedAt: "2026-06-19T16:00:00Z", status: "ready" },
  { id: "ariel-shen",           name: "Ariel Shen",           dob: "1992-05-18", condition: "Generalized Anxiety",         nextVisit: "2026-08-10", checkInCount: 8,  lastCheckIn: "2026-06-17T10:00:00Z", interimGeneratedAt: "2026-06-17T13:00:00Z", status: "ready" },
  { id: "aryaman-khanna",       name: "Aryaman Khanna",       dob: "1986-09-03", condition: "Fibromyalgia",                nextVisit: "2026-07-20", checkInCount: 12, lastCheckIn: "2026-06-21T07:00:00Z", interimGeneratedAt: "2026-06-16T09:00:00Z", status: "needs-review", newCheckInsSinceInterim: 4 },
  { id: "asim-ali",             name: "Asim Ali",             dob: "1975-04-12", condition: "Lupus",                       nextVisit: "2026-10-01", checkInCount: 5,  lastCheckIn: "2026-06-10T14:00:00Z", interimGeneratedAt: null, status: "no-interim" },
  { id: "audrey-zhang",         name: "Audrey Zhang",         dob: "1998-08-27", condition: "Post Surgery Recovery",       nextVisit: "2026-09-05", checkInCount: 0,  lastCheckIn: null, interimGeneratedAt: null, status: "no-checkins" },
  { id: "avy",                  name: "Avy",                  dob: "1990-12-15", condition: "Psoriatic Arthritis",         nextVisit: "2026-07-08", checkInCount: 9,  lastCheckIn: "2026-06-20T16:00:00Z", interimGeneratedAt: "2026-06-20T18:00:00Z", status: "ready", alertFlagged: true, alertReason: "Pain severity spiked to 8/10, up from a recent average of 4" },
  { id: "howard-meng",          name: "Howard Meng",          dob: "1968-02-20", condition: "Osteoarthritis",              nextVisit: "2026-08-22", checkInCount: 16, lastCheckIn: "2026-06-21T08:00:00Z", interimGeneratedAt: "2026-06-18T11:00:00Z", status: "needs-review", newCheckInsSinceInterim: 2 },
  { id: "clara-tu",             name: "Clara Tu",             dob: "1994-06-09", condition: "Crohn's Disease",             nextVisit: "2026-09-18", checkInCount: 6,  lastCheckIn: "2026-06-14T09:00:00Z", interimGeneratedAt: null, status: "no-interim" },
  { id: "damon-huynh",          name: "Damon Huynh",          dob: "1983-10-31", condition: "IBS / GI Tracking",           nextVisit: "2026-07-30", checkInCount: 13, lastCheckIn: "2026-06-19T10:00:00Z", interimGeneratedAt: "2026-06-19T12:00:00Z", status: "ready" },
  { id: "daniel-ng",            name: "Daniel Ng",            dob: "1977-03-07", condition: "Chronic Fatigue Syndrome",    nextVisit: "2026-08-15", checkInCount: 10, lastCheckIn: "2026-06-18T11:00:00Z", interimGeneratedAt: "2026-06-18T15:00:00Z", status: "ready" },
  { id: "daniel-samony",        name: "Daniel Samony",        dob: "1965-11-25", condition: "Type 2 Diabetes Monitoring",  nextVisit: "2026-07-12", checkInCount: 18, lastCheckIn: "2026-06-21T07:30:00Z", interimGeneratedAt: "2026-06-15T10:00:00Z", status: "needs-review", newCheckInsSinceInterim: 5 },
  { id: "davyn-paringkoan",     name: "Davyn Paringkoan",     dob: "1996-07-14", condition: "Postpartum Recovery",         nextVisit: "2026-08-28", checkInCount: 4,  lastCheckIn: "2026-06-12T13:00:00Z", interimGeneratedAt: null, status: "no-interim" },
  { id: "deleena-trisha-ghosh", name: "Deleena Trisha Ghosh", dob: "1991-02-03", condition: "Generalized Anxiety",         nextVisit: "2026-09-25", checkInCount: 0,  lastCheckIn: null, interimGeneratedAt: null, status: "no-checkins", alertFlagged: true, alertReason: "No check-ins received — patient may need outreach before next visit" },
  { id: "denver-nguyen",        name: "Denver Nguyen",        dob: "1985-08-19", condition: "Rheumatoid Arthritis",        nextVisit: "2026-07-22", checkInCount: 15, lastCheckIn: "2026-06-20T09:00:00Z", interimGeneratedAt: "2026-06-20T13:00:00Z", status: "ready" },
  { id: "derek-luan",           name: "Derek Luan",           dob: "1973-05-28", condition: "Multiple Sclerosis",          nextVisit: "2026-08-07", checkInCount: 11, lastCheckIn: "2026-06-21T06:00:00Z", interimGeneratedAt: "2026-06-18T14:00:00Z", status: "needs-review", newCheckInsSinceInterim: 3 },
  { id: "dylan-dang",           name: "Dylan Dang",           dob: "1999-01-11", condition: "Migraine Tracking",           nextVisit: "2026-10-10", checkInCount: 8,  lastCheckIn: "2026-06-16T14:00:00Z", interimGeneratedAt: null, status: "no-interim" },
  { id: "dylan-hopkins",        name: "Dylan Hopkins",        dob: "1980-09-22", condition: "Fibromyalgia",                nextVisit: "2026-07-18", checkInCount: 12, lastCheckIn: "2026-06-19T15:00:00Z", interimGeneratedAt: "2026-06-19T18:00:00Z", status: "ready" },
  { id: "dylan-huynh",          name: "Dylan Huynh",          dob: "1959-04-16", condition: "Osteoarthritis",              nextVisit: "2026-08-03", checkInCount: 9,  lastCheckIn: "2026-06-17T12:00:00Z", interimGeneratedAt: "2026-06-17T16:00:00Z", status: "ready" },
  { id: "elena-vasquez",        name: "Elena Vasquez",        dob: "1987-12-30", condition: "Lupus",                       nextVisit: "2026-07-25", checkInCount: 14, lastCheckIn: "2026-06-21T09:00:00Z", interimGeneratedAt: "2026-06-18T10:00:00Z", status: "needs-review", newCheckInsSinceInterim: 2, alertFlagged: true, alertReason: "Medication non-adherence flagged in 2 of the last 5 check-ins" },
  { id: "emma-lee",             name: "Emma Lee",             dob: "1993-06-08", condition: "Psoriatic Arthritis",         nextVisit: "2026-09-08", checkInCount: 5,  lastCheckIn: "2026-06-13T10:00:00Z", interimGeneratedAt: null, status: "no-interim" },
  { id: "erfan-kaden-ballew",   name: "Erfan Kaden Ballew",   dob: "1971-03-14", condition: "Crohn's Disease",             nextVisit: "2026-10-05", checkInCount: 0,  lastCheckIn: null, interimGeneratedAt: null, status: "no-checkins" },
  { id: "eric-liu",             name: "Eric Liu",             dob: "1989-10-07", condition: "Chronic Pain",                nextVisit: "2026-07-29", checkInCount: 17, lastCheckIn: "2026-06-20T14:00:00Z", interimGeneratedAt: "2026-06-20T17:00:00Z", status: "ready" },
  { id: "esther-luan",          name: "Esther Luan",          dob: "1984-07-21", condition: "IBS / GI Tracking",           nextVisit: "2026-08-18", checkInCount: 10, lastCheckIn: "2026-06-21T08:30:00Z", interimGeneratedAt: "2026-06-17T11:00:00Z", status: "needs-review", newCheckInsSinceInterim: 4 },
  { id: "eugene-chao",          name: "Eugene Chao",          dob: "1972-01-05", condition: "Chronic Fatigue Syndrome",    nextVisit: "2026-09-30", checkInCount: 7,  lastCheckIn: "2026-06-11T13:00:00Z", interimGeneratedAt: null, status: "no-interim" },
  { id: "hailey-kim",           name: "Hailey Kim",           dob: "1997-05-17", condition: "Post Surgery Recovery",       nextVisit: "2026-07-11", checkInCount: 8,  lastCheckIn: "2026-06-20T10:00:00Z", interimGeneratedAt: "2026-06-20T13:00:00Z", status: "ready", alertFlagged: true, alertReason: "Pain rising for 3 consecutive check-ins (4 → 6 → 8/10)" },
  { id: "henry-speiser",        name: "Henry Speiser",        dob: "1958-11-09", condition: "Type 2 Diabetes Monitoring",  nextVisit: "2026-08-26", checkInCount: 13, lastCheckIn: "2026-06-21T07:00:00Z", interimGeneratedAt: "2026-06-18T09:00:00Z", status: "needs-review", newCheckInsSinceInterim: 3 },
  { id: "ichchitaa-sawrikar",   name: "Ichchitaa Sawrikar",   dob: "1995-08-14", condition: "Postpartum Recovery",         nextVisit: "2026-09-15", checkInCount: 0,  lastCheckIn: null, interimGeneratedAt: null, status: "no-checkins" },
  { id: "ivan-mao",             name: "Ivan Mao",             dob: "1981-04-28", condition: "Rheumatoid Arthritis",        nextVisit: "2026-08-12", checkInCount: 6,  lastCheckIn: "2026-06-14T11:00:00Z", interimGeneratedAt: null, status: "no-interim" },
  { id: "merrick-zheng",       name: "Merrick Zheng",        dob: "1990-02-11", condition: "Chronic Pain",                nextVisit: "2026-07-31", checkInCount: 10, lastCheckIn: "2026-06-19T12:00:00Z", interimGeneratedAt: "2026-06-19T15:00:00Z", status: "ready" },
  { id: "matthew-nguyen",      name: "Matthew Nguyen",       dob: "1986-06-24", condition: "Migraine Tracking",           nextVisit: "2026-08-09", checkInCount: 7,  lastCheckIn: "2026-06-20T10:00:00Z", interimGeneratedAt: "2026-06-17T13:00:00Z", status: "needs-review", newCheckInsSinceInterim: 2 },
  { id: "richard-wei",         name: "Richard Wei",          dob: "1978-09-17", condition: "Type 2 Diabetes Monitoring",  nextVisit: "2026-07-24", checkInCount: 5,  lastCheckIn: "2026-06-13T09:00:00Z", interimGeneratedAt: null, status: "no-interim" },
];

export function getPatient(id: string): DemoPatient | undefined {
  return DEMO_PATIENTS.find((p) => p.id === id);
}
