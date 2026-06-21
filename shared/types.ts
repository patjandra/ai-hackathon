// Shared TypeScript contracts for PreVisit.
// Locked during the first 30 minutes — frontend and backend both import from here.

export type Trajectory = "IMPROVING" | "STABLE" | "DECLINING";
export type Confidence = "high" | "medium" | "low";
export type Severity = "routine" | "notable" | "urgent";

export interface MetricValue<T> {
  value: T | null;
  confidence: Confidence | null;
  raw: string | null;
}

export interface CheckInMetrics {
  pain: MetricValue<number>;
  fatigue: MetricValue<string>;
  swelling: MetricValue<string>;
  morningStiffness: MetricValue<number>;
  medicationAdherence: MetricValue<string>;
}

export type MetricKey = keyof CheckInMetrics;

export const METRIC_KEYS: MetricKey[] = [
  "pain",
  "fatigue",
  "swelling",
  "morningStiffness",
  "medicationAdherence",
];

export interface Patient {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  diagnosis: string; // "Rheumatoid Arthritis" (hardcoded for MVP)
  lastAppointment: string; // ISO date
  nextAppointment: string; // ISO date
  dashboardUrl?: string;
}

export interface CheckIn {
  id: string;
  patientId: string;
  date: string; // ISO date
  rawTranscript: string;
  metrics: CheckInMetrics;
  coveredMetrics: MetricKey[];
  missingMetrics: MetricKey[];
  followUpUsed: boolean;
  patientQuote: string | null;
  trackedParameters?: string[]; // doctor-selected topics captured when this check-in began
  trackedFindings?: Record<string, string | null>; // doctor-assigned custom params
}

export interface TrackedParameters {
  patientId: string;
  parameters: string[];
  assignedBy: string | null;
  assignedAt: string | null;
}

export interface KeyEvent {
  date: string; // ISO date
  description: string;
  severity: Severity;
}

export interface WhyThisVisitMatters {
  trajectory: Trajectory;
  focusAreas: string[];
}

export interface PhysicianSummary {
  patientId: string;
  generatedAt: string;
  dateRange: { from: string; to: string };
  checkInCount: number;
  whyThisVisitMatters: WhyThisVisitMatters;
  assessment: string;
  keyEvents: KeyEvent[];
  metricSummary: {
    pain: string;
    fatigue: string;
    adherence: string;
    morningStiffness: string;
    swelling: string;
  };
  patientQuote: string;
  patientQuoteDate: string;
}

// ----- API payloads -----

export interface CheckInResponse {
  checkinId: string;
  metrics: CheckInMetrics;
  coveredMetrics: MetricKey[];
  missingMetrics: MetricKey[];
  // Metrics the patient touched on but left unclear (still missing). Used to
  // steer the next follow-up to the "topic in discussion" before the top gap.
  ambiguousMetrics: MetricKey[];
  requiredTopics: string[];
  coveredTopics: string[];
  missingTopics: string[];
  ambiguousTopics: string[];
  followUpQuestion: string | null;
}

export interface CompleteResponse {
  checkinId: string;
  saved: true;
}

// ----- Frontend-only checklist state -----

export interface ChecklistState {
  optimistic: string[]; // transient keyword scan on interim — highlighted yellow
  ambiguous: string[]; // touched on but unclear — stays yellow until answered
  confirmed: string[]; // confirmed by Claude on final — green
  missing: string[]; // still empty per Claude
}

// ----- Deepgram WebSocket relay message (backend -> frontend) -----

export interface TranscriptMessage {
  transcript: string;
  type: "interim" | "final" | "utterance_end";
}
