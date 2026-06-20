// Task 1 — combined extraction + coverage + follow-up (one call per utterance).
// Runs on EXTRACTION_MODEL (Haiku 4.5). Keep the JSON schema OUT of any
// compressed span (plan issue B): only `transcript` is natural language.

export interface CombinedResult {
  metrics: {
    pain: { value: number | null; confidence: string | null; raw: string | null };
    fatigue: { value: string | null; confidence: string | null; raw: string | null };
    swelling: { value: string | null; confidence: string | null; raw: string | null };
    morning_stiffness: { value: number | null; confidence: string | null; raw: string | null };
    medication_adherence: { value: string | null; confidence: string | null; raw: string | null };
  };
  coveredMetrics: string[];
  missingMetrics: string[];
  followUpQuestion: string | null;
  patientQuote: string | null;
}

export function combinedPrompt(transcript: string): string {
  return `You are a clinical check-in assistant for a rheumatology practice.

The doctor requires these metrics:
- pain level: 0-10
- fatigue: low / moderate / high
- swelling: none / mild / significant
- morning stiffness: duration in minutes or none
- medication adherence: yes / partial / no

Patient transcript:
"${transcript}"

Task:
1. Extract any mentioned metrics.
2. Mark which required metrics are still missing.
3. If anything is missing, generate one natural follow-up question.
4. Do not infer values the patient did not clearly provide.
5. Select the single most clinically significant quote from the transcript
   (something that captures meaning beyond the structured metrics).

Return JSON only:

{
  "metrics": {
    "pain": { "value": null, "confidence": null, "raw": null },
    "fatigue": { "value": null, "confidence": null, "raw": null },
    "swelling": { "value": null, "confidence": null, "raw": null },
    "morning_stiffness": { "value": null, "confidence": null, "raw": null },
    "medication_adherence": { "value": null, "confidence": null, "raw": null }
  },
  "coveredMetrics": [],
  "missingMetrics": [],
  "followUpQuestion": null,
  "patientQuote": null
}`;
}
