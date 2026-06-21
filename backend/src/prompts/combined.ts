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

export function combinedPrompt(transcript: string, trackedParams: string[] = [], context = ""): string {
  // Custom params = anything the doctor assigned beyond the standard 5.
  const standard = new Set(["Pain", "Fatigue", "Swelling", "Morning stiffness", "Medication adherence"]);
  const custom = trackedParams.filter((p) => !standard.has(p));

  const customSection = custom.length > 0
    ? `\nAdditional tracked parameters assigned by this patient's doctor — listen for these too:
${custom.map((p) => `- ${p}`).join("\n")}
For each additional parameter, put a short, faithful summary of the patient's answer
in trackedFindings. Use null only when they did not answer that topic. Do not invent
scores or clinical interpretations.\n`
    : "";

  // Build the tracked_findings schema for the JSON output.
  const trackedFindingsSchema = custom.length > 0
    ? `  "trackedFindings": {\n${custom.map((p) => `    "${p}": null`).join(",\n")}\n  },`
    : `  "trackedFindings": {},`;

  return `You are a clinical check-in assistant. The data you extract goes straight to
the patient's doctor, so it must be specific and accurate. Assign a value to a metric
ONLY when the patient gives a clear, unambiguous answer in the required form. If they
mention the topic but stay vague, qualitative, or non-committal, leave value null AND
list the metric in ambiguousMetrics so we ask a precise follow-up. Never convert a
qualitative description into a specific value yourself.

Standard metrics to always extract:
- pain: a NUMBER 0-10.
    CLEAR: "my pain is a 6", "about a 4 out of 10", "zero pain" -> 0.
    VAGUE (-> null + ambiguous): "a lot of pain", "it hurts", "pretty bad", "manageable",
    "better than last week". A qualitative description with no number is NOT covered.
- fatigue: low / moderate / high (the LEVEL OF FATIGUE). If the patient describes their
  ENERGY instead, invert it: high energy = "low" fatigue, low energy = "high" fatigue,
  moderate energy = "moderate" fatigue.
    CLEAR: "no energy at all" -> high, "felt pretty energetic" -> low, "energy was moderate".
    VAGUE (-> null + ambiguous): "kind of tired", "so-so", "up and down", "a bit off".
- swelling: none / mild / significant.
    CLEAR: "no swelling" -> none, "a little puffy" -> mild, "really swollen" -> significant.
    VAGUE (-> null + ambiguous): "my joints felt off", "not great", "a bit weird".
- morning stiffness: a DURATION in minutes, or "none".
    CLEAR: "stiff for about 30 minutes", "loosened up in 10 minutes", "no stiffness" -> none.
    VAGUE (-> null + ambiguous): "stiff in the morning", "took a while to get going",
    "some stiffness", "a bit stiff". A mention of stiffness with no duration is NOT covered.
- medication adherence: yes / partial / no. Use "yes" ONLY when the patient clearly
  indicates they took their full prescribed medication (e.g. "took all my meds",
  "took it as prescribed"). Use "partial" / "no" for clearly missed or skipped doses.
  Vague statements like "took some meds", "took some medication", or "had my meds"
  are NOT clear adherence -> leave the value null and mark medication_adherence as
  ambiguous so we can confirm whether they took it as prescribed.
${customSection}
${context ? `The patient was just asked this question: "${context}"
Their message below is a direct reply to it. Interpret short answers (e.g. "yes",
"no", a number, or "low/moderate/high") as the answer to THAT question and set the
matching metric accordingly. Still extract any other metrics they happen to mention.
- If the question asks whether a symptom is PRESENT and they answer "no", "nope", or
  "none", record that metric as absent: pain -> 0, swelling -> "none", morning
  stiffness -> "none", medication adherence -> "no".
- If they only AFFIRM presence ("yes", "yeah", "a bit", "some") WITHOUT the specific
  value the question asked for (a number, a duration, or none/mild/significant), keep
  that metric's value null and mark it ambiguous so we ask the precise follow-up next.

` : ""}Patient transcript:
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
   Examples: "my joints felt a little off" → swelling is ambiguous (mentioned, not
   clearly given). "I took some meds" → medication_adherence is ambiguous (took
   medication, but unclear if it was the full prescribed dose).
   Do not list metrics the patient never referenced at all.

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
