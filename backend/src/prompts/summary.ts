// Tasks 2+3 — "Why This Visit Matters" + full physician summary in ONE call.
// Runs on SUMMARY_MODEL (Sonnet 4.6). Compress only `checkin_history`.

import type { CheckIn } from "../../../shared/types.js";

export function formatCheckinHistory(checkins: CheckIn[]): string {
  return checkins
    .map((c) => {
      const m = c.metrics;
      return [
        `${c.date}:`,
        `pain=${m.pain.value ?? "?"}`,
        `fatigue=${m.fatigue.value ?? "?"}`,
        `swelling=${m.swelling.value ?? "?"}`,
        `morningStiffness=${m.morningStiffness.value ?? "?"}min`,
        `adherence=${m.medicationAdherence.value ?? "?"}`,
        c.patientQuote ? `quote="${c.patientQuote}"` : "",
      ]
        .filter(Boolean)
        .join("  ");
    })
    .join("\n");
}

export function summaryPrompt(history: string, n: number, lastDate: string): string {
  return `You are generating a complete pre-visit briefing for a rheumatologist.
The patient has ${n} check-ins since their last appointment on ${lastDate}.

Check-in history:
${history}

Return JSON only:
{
  "whyThisVisitMatters": {
    "trajectory": "IMPROVING",
    "focusAreas": [
      "Pain decreased 7 → 4 but morning stiffness increased 10 → 30 min over last 2 weeks",
      "Missed 1 dose Oct 15, correlated with symptom spike next day",
      "Patient concerned medication may be plateauing — address proactively"
    ]
  },
  "assessment": "Pain improved from 7 → 4 average over six weeks...",
  "keyEvents": [
    { "date": "2025-10-09", "description": "Flare after hiking", "severity": "notable" }
  ],
  "metricSummary": {
    "pain": "7 → 4 average",
    "fatigue": "High → Low",
    "adherence": "Missed 1 dose",
    "morningStiffness": "10 → 30 min (recent increase)",
    "swelling": "Resolved after week 3"
  },
  "patientQuote": "Morning stiffness is my main thing now. Worried it's not going away.",
  "patientQuoteDate": "2025-11-10"
}

whyThisVisitMatters rules:
- trajectory is one of IMPROVING / STABLE / DECLINING
- Maximum 3 focusAreas; every bullet contains a specific data point (number, date, trend)
- Lead with what changed; flag anything that contradicts the overall trajectory
- Never vague — "pain decreased from 7 → 4", not "some improvement"
- Do NOT repeat the trajectory label in the bullets

Assessment rules:
- 2-3 sentences, narrative arc, specific numbers, end with primary concern
- Write as if a senior physician is handing this to a colleague; no generic summaries`;
}
