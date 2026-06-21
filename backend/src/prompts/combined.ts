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
  trackedFindings: Record<string, string | null>;
  coveredMetrics: string[];
  missingMetrics: string[];
  followUpQuestion: string | null;
  patientQuote: string | null;
}

// Standard 5 RA metrics always extracted regardless of patient settings.
const STANDARD_KEYS = ["pain", "fatigue", "swelling", "morning_stiffness", "medication_adherence"];

export function combinedPrompt(transcript: string, trackedParams: string[] = []): string {
  // Custom params = anything the doctor assigned beyond the standard 5.
  const standard = new Set(["Pain", "Fatigue", "Swelling", "Morning stiffness", "Medication adherence"]);
  const custom = trackedParams.filter((p) => !standard.has(p));

  const customSection = custom.length > 0
    ? `\nAdditional tracked parameters assigned by this patient's doctor — listen for these too:\n${custom.map((p) => `- ${p}`).join("\n")}\n`
    : "";

  // Build the tracked_findings schema for the JSON output.
  const trackedFindingsSchema = custom.length > 0
    ? `  "trackedFindings": {\n${custom.map((p) => `    "${p}": null`).join(",\n")}\n  },`
    : `  "trackedFindings": {},`;

  return `You are a clinical check-in assistant.

Standard metrics to always extract:
- pain level: 0-10
- fatigue: low / moderate / high
- swelling: none / mild / significant
- morning stiffness: duration in minutes or "none"
- medication adherence: yes / partial / no
${customSection}
Patient transcript:
"${transcript}"

Tasks:
1. Extract ONLY what the patient explicitly stated. If they did not mention a metric, set all fields to null.
   It is normal and expected for most metrics to be null in a short message.
2. For each additional tracked parameter, write a brief phrase describing what the patient said,
   or null if they did not mention it. NEVER fabricate or infer.
3. A metric is "covered" only if it has an explicit value. List uncovered ones in missingMetrics.
4. Write ONE warm, natural follow-up question covering the most important uncovered items
   (standard metrics AND any uncovered tracked parameters). One sentence, no em dashes.
5. Pick the most clinically significant quote from the transcript, or null if none.

Return JSON only:

{
  "metrics": {
    "pain": { "value": null, "confidence": null, "raw": null },
    "fatigue": { "value": null, "confidence": null, "raw": null },
    "swelling": { "value": null, "confidence": null, "raw": null },
    "morning_stiffness": { "value": null, "confidence": null, "raw": null },
    "medication_adherence": { "value": null, "confidence": null, "raw": null }
  },
${trackedFindingsSchema}
  "coveredMetrics": [],
  "missingMetrics": [],
  "followUpQuestion": null,
  "patientQuote": null
}`;
}
