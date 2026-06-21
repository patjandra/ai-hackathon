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
      "Pain fell from 7 to 4, but morning stiffness rose from 10 to 30 min in the last 2 weeks",
      "One missed dose on Oct 15 lined up with a symptom spike the next day",
      "Patient worries the medication is plateauing. Worth raising early."
    ]
  },
  "assessment": "Pain improved from 7 → 4 average over six weeks...",
  "keyEvents": [
    { "date": "2025-10-09", "description": "Flare after hiking", "severity": "notable" }
  ],
  "metricSummary": {
    "pain": "7 → 4",
    "fatigue": "High → Low",
    "adherence": "1 missed dose",
    "morningStiffness": "10 → 30 min",
    "swelling": "Resolved"
  },
  "patientQuote": "Morning stiffness is my main thing now. Worried it's not going away.",
  "patientQuoteDate": "2025-11-10"
}

Writing style (applies to assessment, focusAreas, and keyEvents descriptions):
- Keep sentences short and easy to skim. Prefer two short sentences over one long one.
- Do NOT use em dashes or en dashes (the "—" or "–" characters). Use a period or comma instead.
- Do not join clauses with a dash, and do not use semicolons in prose.
- Plain, direct clinical language. No flowery phrasing.
- Numeric trends may use a simple arrow (e.g. "7 to 4" or "7 → 4"); never use a dash for this.

whyThisVisitMatters rules:
- trajectory is one of IMPROVING / STABLE / DECLINING
- Maximum 3 focusAreas; every bullet contains a specific data point (number, date, trend)
- Lead with what changed, and flag anything that contradicts the overall trajectory
- Never vague. Write "pain decreased from 7 to 4", not "some improvement"
- Do NOT repeat the trajectory label in the bullets

Assessment rules:
- 2-3 short sentences, narrative arc, specific numbers, end with the primary concern
- Write as if a senior physician is handing this to a colleague. No generic summaries.

metricSummary rules (CRITICAL, these render as tiny at-a-glance chips):
- Each value MUST be ultra-terse: max 4 words, ideally a single start → end trend
- Use an arrow for change: "7 → 4", "High → Low", "60 → 30 min"
- NO dates, NO parentheticals, NO semicolons, NO full sentences
- Examples of GOOD: "7 → 4", "1 missed dose", "Resolved", "10 → 30 min"
- Examples of BAD: "Peak 8 (2025-10-09) → trough 3; net improvement from 7"`;
}
