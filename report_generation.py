"""
Doctor-facing report generation and trend extraction.

generate_doctor_report() — calls Claude to produce the pre-visit briefing JSON.
extract_trends()         — parses stored history into chart-ready time series.
"""

import json
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

DOCTOR_REPORT_PROMPT = """You are generating a pre-visit clinical briefing for a physician about to see a patient with a chronic condition.

Below is the patient's full self-reported check-in history between their last appointment and today, in chronological order.

Check-in history:
{history_json}

Generate a JSON report. Output ONLY valid JSON, no preamble:
{{
  "since_last_visit_summary": "2-4 sentence narrative. Cover overall trajectory, notable patterns, and anything the physician should know walking in. Be specific about direction of change (improving / worsening / mixed).",
  "key_trends": [
    {{"metric": "pain", "trend": "improving", "detail": "Average severity dropped from ~7 to ~4 over 3 weeks"}},
    ...
  ],
  "major_events": [
    {{"date": "YYYY-MM-DD", "description": "Brief clinical description of what happened"}},
    ...
  ],
  "patient_concerns": ["Recurring or flagged concerns in the patient's own words"],
  "medication_notes": "One sentence on adherence and any issues mentioned.",
  "suggested_discussion_points": ["Point 1", "Point 2", "Point 3"]
}}

Rules:
- Clinical and concise. This is for a physician — no fluff.
- Only what the data supports. Never fabricate information.
- major_events: only notable deviations, flares, or significant changes. Omit array entries if nothing notable occurred.
- Output ONLY valid JSON.
"""


def generate_doctor_report(user_id: str, history: list[dict]) -> dict:
    history_json = json.dumps(history, indent=2)
    prompt = DOCTOR_REPORT_PROMPT.format(history_json=history_json)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:].strip()

    report = json.loads(raw)
    report["user_id"] = user_id
    report["entry_count"] = len(history)
    report["date_range"] = {
        "first": history[0]["date"] if history else None,
        "last": history[-1]["date"] if history else None,
    }
    return report


# Rough text → numeric mapping for mood field.
_MOOD_SCORES = {
    "great": 9, "excellent": 9, "wonderful": 9,
    "good": 7, "fine": 6, "okay": 5, "ok": 5, "alright": 5,
    "bad": 3, "rough": 3, "low": 3, "foggy": 3, "irritable": 3,
    "terrible": 1, "awful": 1, "horrible": 1,
}


def extract_trends(history: list[dict]) -> dict:
    """
    Pull time-series data from stored history for the frontend charts.
    Each metric is a list of {date, value} objects (value may be null).
    """
    pain, energy, sleep, mood = [], [], [], []

    for entry in history:
        d = entry.get("date")
        symptoms = entry.get("symptoms") or []

        # Find the highest-severity pain-related symptom for that day.
        pain_val = None
        for s in symptoms:
            if s and "pain" in (s.get("name") or "").lower():
                sev = s.get("severity")
                if sev is not None:
                    try:
                        sev = float(sev)
                        if pain_val is None or sev > pain_val:
                            pain_val = sev
                    except (ValueError, TypeError):
                        pass
        pain.append({"date": d, "value": pain_val})

        energy.append({"date": d, "value": entry.get("energy")})
        sleep.append({"date": d, "value": entry.get("sleep_hours")})

        mood_text = (entry.get("mood") or "").lower().strip()
        mood_val = _MOOD_SCORES.get(mood_text)
        mood.append({"date": d, "value": mood_val, "label": entry.get("mood")})

    return {"pain": pain, "energy": energy, "sleep": sleep, "mood": mood}
