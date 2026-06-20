"""
Step 2: store extracted check-ins in Redis, keyed by user + date.

Builds directly on extraction_poc.py -- same extraction function, same
schema. This step proves we can persist a check-in and read back a
user's full history in order, which is what the timeline, insight line,
and doctor report all depend on next.

Run with: python3 redis_storage.py
Requires: ANTHROPIC_API_KEY set, and a running local Redis (see notes below).
"""

import json
import os
import redis
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Connect to Redis Cloud using env vars (set these in your terminal before running):
#   export REDIS_HOST=walk-birth-aunt-27384.db.redis.io
#   export REDIS_PORT=16202
#   export REDIS_PASSWORD=your_actual_password
r = redis.Redis(
    host=os.environ.get("REDIS_HOST", "localhost"),
    port=int(os.environ.get("REDIS_PORT", 6379)),
    password=os.environ.get("REDIS_PASSWORD"),
    decode_responses=True,
)

METRICS = ["pain", "fatigue", "sleep_quality", "mood", "medication_adherence"]

EXTRACTION_PROMPT = """You are extracting structured clinical check-in data from a patient's spoken or typed daily update.

Track these metrics if mentioned: {metrics}

Rules:
- Only extract what the patient actually said. Do not infer or guess values they did not mention.
- If a metric was not mentioned, set its value to null. Do not fabricate data.
- Only include a symptom in the "symptoms" array if the patient actually described it as present. Do not add a symptom just because a related concept was mentioned (e.g. don't add "fatigue" just because "energy" was discussed positively).
- Symptom severity should be on a 1-10 scale if a number can reasonably be inferred from descriptive language. If you cannot reasonably infer a number, set severity to null.
- "triggers_mentioned" should capture anything the patient causally links to a symptom.
- Extract medications mentioned, including whether the patient said they took them. If a medication isn't named, omit it rather than inventing a placeholder name.
- Output ONLY valid JSON. No preamble, no markdown code fences, no explanation.

Transcript:
\"\"\"{transcript}\"\"\"

Output this exact JSON shape (use null for unmentioned fields):
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


def extract_checkin(transcript: str) -> dict:
    """Same extraction logic validated in extraction_poc.py."""
    prompt = EXTRACTION_PROMPT.format(metrics=", ".join(METRICS), transcript=transcript)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw_text = response.content[0].text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.startswith("json"):
            raw_text = raw_text[4:].strip()
    return json.loads(raw_text)


def save_checkin(user_id: str, date: str, transcript: str, extracted: dict) -> str:
    """
    Save one check-in to Redis.

    Two writes happen here:
    1. A hash storing the full check-in entry (transcript + extracted data),
       under a key like 'checkin:cate:2026-06-18'.
    2. An entry in a sorted set 'history:cate', which keeps a list of all
       this user's check-in dates IN ORDER (sorted by date). This is what
       lets us pull back "give me this user's full timeline" without
       scanning every key in Redis.
    """
    entry = {
        "user_id": user_id,
        "date": date,
        "raw_transcript": transcript,
        **extracted,
    }

    checkin_key = f"checkin:{user_id}:{date}"
    r.set(checkin_key, json.dumps(entry))

    # date as the sort "score" -- store as a timestamp-like number for ordering
    score = int(date.replace("-", ""))  # e.g. "2026-06-18" -> 20260618
    r.zadd(f"history:{user_id}", {checkin_key: score})

    return checkin_key


def get_user_history(user_id: str) -> list[dict]:
    """Pull back every check-in for a user, in chronological order."""
    checkin_keys = r.zrange(f"history:{user_id}", 0, -1)  # oldest -> newest
    history = []
    for key in checkin_keys:
        raw = r.get(key)
        if raw:
            history.append(json.loads(raw))
    return history


if __name__ == "__main__":
    fake_checkins = [
        ("2026-06-16", "Knee pain was about a 6 today, walking was fine but stairs were really rough. Didn't sleep great last night, maybe 5 hours. Took my ibuprofen this morning."),
        ("2026-06-17", "Feeling pretty good today actually, energy was decent. Pain's been low the last couple days. I did skip my evening dose of meds though, just forgot."),
        ("2026-06-18", "Today was bad. Pain was probably an 8, started right after I went for a long walk yesterday. Barely slept, felt foggy and irritable all day."),
    ]

    user_id = "cate"

    print("Extracting and saving check-ins...\n")
    for date, transcript in fake_checkins:
        extracted = extract_checkin(transcript)
        key = save_checkin(user_id, date, transcript, extracted)
        print(f"Saved {key}")

    print(f"\n--- Full history for '{user_id}', in order ---\n")
    history = get_user_history(user_id)
    for entry in history:
        print(f"{entry['date']}: {entry['symptoms']}")