export interface MetricValue<T = any> {
  value: T | null;
  confidence: "high" | "medium" | "low" | null;
  raw: string | null;
}

export interface CheckIn {
  id: string;
  patientId: string;
  date: string;
  rawTranscript: string;
  patientQuote: string | null;
  metrics: {
    pain: MetricValue<number>;
    fatigue: MetricValue<string>;
    swelling: MetricValue<string>;
    morning_stiffness: MetricValue<number>;
    medication_adherence: MetricValue<string>;
  };
  coveredMetrics: string[];
  missingMetrics: string[];
  followUpUsed: boolean;
}

export interface Patient {
  id: string;
  name: string;
  diagnosis: string;
  lastAppointment: string;
  nextAppointment: string;
}

export interface PhysicianSummary {
  patientId: string;
  generatedAt: string;
  checkInCount: number;
  dateRange: { from: string; to: string };
  whyThisVisitMatters: {
    trajectory: "IMPROVING" | "STABLE" | "DECLINING";
    focusAreas: string[];
  };
  assessment: string;
  keyEvents: Array<{ date: string; description: string; severity: string }>;
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

export type ChecklistItemState = "dim" | "optimistic" | "confirmed" | "missing";
