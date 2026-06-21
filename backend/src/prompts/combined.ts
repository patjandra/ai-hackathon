export const COMBINED_PROMPT = (transcript: string) => `You are a clinical check-in assistant for a rheumatology practice.

The doctor requires these metrics:
- pain level: 0-10
- fatigue: low / moderate / high
- swelling: none / mild / significant
- morning stiffness: duration in minutes, or "none"
- medication adherence: yes / partial / no

Patient transcript:
"${transcript}"

Tasks:
1. Extract any metrics the patient clearly mentioned.
2. Identify which required metrics are still missing.
3. If anything is missing, write one natural follow-up question that asks about the missing items conversationally (not as a list of form fields).
4. Do not infer values the patient did not clearly provide.
5. Select the single most clinically significant quote from the transcript — something that captures context beyond the structured numbers.

Return ONLY valid JSON, no preamble:
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
