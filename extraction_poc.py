"""
Proof of concept: structured extraction from a patient check-in transcript.

Goal: prove that Claude can reliably turn free-text/voice transcripts into
the structured JSON schema your app depends on. This is the highest-risk
piece of the whole pipeline -- get this solid before building Redis,
the input UI, or the dashboard.

Run with: python3 extraction_poc.py
Requires: ANTHROPIC_API_KEY environment variable set.
"""

import json
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Hardcoded doctor-defined metrics for the hackathon MVP.
# (Skip the "doctor selects metrics" config UI for now -- just fix these.)
METRICS = ["pain", "fatigue", "sleep_quality", "mood", "medication_adherence"]

EXTRACTION_PROMPT = """You are extracting structured clinical check-in data from a patient's spoken or typed daily update.

Track these metrics if mentioned: {metrics}

Rules:
- Only extract what the patient actually said. Do not infer or guess values they did not mention.
- If a metric was not mentioned, set its value to null. Do not fabricate data.
- Symptom severity should be on a 1-10 scale if a number can reasonably be inferred from descriptive language (e.g. "really bad" ~ 7-8, "mild" ~ 2-3). If you cannot reasonably infer a number, set severity to null and explain in notes.
- "triggers_mentioned" should capture anything the patient causally links to a symptom (e.g. "after I skipped breakfast").
- Extract medications mentioned, including whether the patient said they took them.
- Output ONLY valid JSON. No preamble, no markdown code fences, no explanation.

Transcript:
\"\"\"{transcript}\"\"\"

Output this exact JSON shape (omit nothing, use null for unmentioned fields):
{{
  "symptoms": [{{"name": "string", "severity": "number or null", "notes": "string or null"}}],
  "sleep_quality": "string or null",
  "sleep_hours": "number or null",
  "triggers_mentioned": ["string", ...],
  "energy": "number 1-10 or null",
  "mood": "string or null",
  "medications": [{{"name": "string", "dose": "string or null", "taken": "boolean or null"}}],
  "extraction_confidence": "high, medium, or low"
}}
"""

# A few fake check-in transcripts covering different metrics/scenarios.
FAKE_TRANSCRIPTS = [
    "Knee pain was about a 6 today, walking was fine but stairs were really rough. "
    "Didn't sleep great last night, maybe 5 hours. Took my ibuprofen this morning.",

    "Feeling pretty good today actually, energy was decent. Pain's been low the last "
    "couple days. I did skip my evening dose of meds though, just forgot.",

    "Today was bad. Pain was probably an 8, started right after I went for a long walk "
    "yesterday. Barely slept, felt foggy and irritable all day.",
]


def extract_checkin(transcript: str) -> dict:
    prompt = EXTRACTION_PROMPT.format(metrics=", ".join(METRICS), transcript=transcript)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = response.content[0].text.strip()
    # Defensive: strip markdown fences if the model adds them anyway.
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.startswith("json"):
            raw_text = raw_text[4:].strip()

    return json.loads(raw_text)


if __name__ == "__main__":
    for i, transcript in enumerate(FAKE_TRANSCRIPTS, start=1):
        print(f"\n--- Check-in {i} ---")
        print(f"Transcript: {transcript}\n")
        try:
            result = extract_checkin(transcript)
            print(json.dumps(result, indent=2))
        except json.JSONDecodeError as e:
            print(f"FAILED to parse JSON: {e}")
        except Exception as e:
            print(f"FAILED: {e}")
