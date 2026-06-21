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
  ambiguousMetrics: string[];
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
- fatigue: low / moderate / high (the LEVEL OF FATIGUE). If the patient describes
  their ENERGY instead, invert it: high energy = "low" fatigue, low energy = "high"
  fatigue, moderate energy = "moderate" fatigue.
- swelling: none / mild / significant
- morning stiffness: duration in minutes or "none"
- medication adherence: yes / partial / no
${customSection}
Patient transcript:
"${transcript}"

Tasks:
1. Extract ONLY what the patient explicitly stated. If they did not mention a metric, set all fields to null.
   It is normal and expected for most metrics to be null in a short message.
2. A metric is "covered" only when it has an explicit value here. List the rest in missingMetrics.
3. If anything is missing, generate one natural follow-up question.
   Keep it short, warm, and easy to answer out loud (one sentence).
   Do NOT use em dashes or en dashes ("—" / "–"); use a comma or period.
4. NEVER infer, assume, or guess. Do not fill in a metric just because it is on the list.
   If the patient said nothing about a metric, its value MUST be null.
   Example: if the patient only mentions pain, then fatigue, swelling, morning_stiffness,
   and medication_adherence all stay null.
5. Select the single most clinically significant quote from the transcript
   (something that captures meaning beyond the structured metrics), or null if none.
6. In ambiguousMetrics, list any metric the patient TOUCHED ON or alluded to but
   did NOT clearly specify (so its value stayed null). Use these exact keys:
   pain, fatigue, swelling, morning_stiffness, medication_adherence.
   Example: "my joints felt a little off" → swelling is ambiguous (mentioned, not
   clearly given). Do not list metrics the patient never referenced at all.

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
  "ambiguousMetrics": [],
  "followUpQuestion": null,
  "patientQuote": null
}`;
}
