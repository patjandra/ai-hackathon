export const SUMMARY_PROMPT = (checkinHistory: string) => `You are generating a pre-visit briefing for a rheumatologist.

Check-in history (oldest to newest):
${checkinHistory}

Return ONLY valid JSON, no preamble:
{
  "whyThisVisitMatters": {
    "trajectory": "IMPROVING",
    "focusAreas": [
      "Pain decreased 7 → 4 but morning stiffness increased 10 → 30 min over last 2 weeks",
      "Missed 1 dose Oct 15, correlated with symptom spike next day",
      "Patient concerned medication may be plateauing — address proactively"
    ]
  },
  "assessment": "2-3 sentence narrative. Lead with trajectory. Use specific numbers. End with primary unresolved concern.",
  "keyEvents": [
    { "date": "YYYY-MM-DD", "description": "Brief clinical description", "severity": "notable" }
  ],
  "metricSummary": {
    "pain": "7 → 4 average",
    "fatigue": "High → Low",
    "adherence": "Missed 1 dose",
    "morningStiffness": "10 → 30 min (recent increase)",
    "swelling": "Resolved after week 3"
  },
  "patientQuote": "The most compelling verbatim patient quote from any check-in.",
  "patientQuoteDate": "YYYY-MM-DD"
}

Rules:
- whyThisVisitMatters: max 3 bullets, each must contain a specific number or date
- Lead with what changed, flag anything contradicting the overall trajectory
- Never use vague language ("pain decreased from 7 → 4" not "some improvement")
- assessment: 2-3 sentences, written as if a senior physician is briefing a colleague
- keyEvents: only include notable deviations, flares, missed doses, or significant changes`;
