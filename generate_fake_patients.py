"""
Generate a larger batch of fake patients for the doctor directory --
enough to test pagination/subpages once the count exceeds 25.

This creates lightweight patient directory records (name, DOB, condition,
status, check-in count, next visit) rather than full check-in histories
for all of them -- generating 25+ full histories via Claude would be slow
and expensive. Keep 1-2 "hero" patients (like Sarah Chen) with real full
histories for the deep-dive demo, and use this script for the rest, which
only need to look right in the directory list and basic empty/status states.

Run with: python3 generate_fake_patients.py
Requires: ANTHROPIC_API_KEY, REDIS_HOST/PORT/PASSWORD set.
"""

import json
import os
import random
from datetime import date, timedelta

import redis
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

r = redis.Redis(
    host=os.environ.get("REDIS_HOST", "localhost"),
    port=int(os.environ.get("REDIS_PORT", 6379)),
    password=os.environ.get("REDIS_PASSWORD"),
    decode_responses=True,
)

CONDITIONS = [
    "Rheumatoid Arthritis", "Chronic Pain", "Multiple Sclerosis",
    "Migraine Tracking", "Post Surgery Recovery", "IBS / GI Tracking",
    "Generalized Anxiety", "Type 2 Diabetes Monitoring", "Fibromyalgia",
    "Postpartum Recovery", "Lupus", "Chronic Fatigue Syndrome",
    "Psoriatic Arthritis", "Osteoarthritis", "Crohn's Disease",
]

STATUSES = ["Interim Ready", "Needs Review", "No Interim", "No Check-ins"]
# Weight towards having data, since an all-empty directory looks sparse in a demo
STATUS_WEIGHTS = [0.35, 0.25, 0.25, 0.15]

NAMES = [
    "Andy Yang", "Aneri Sheth", "Anika Giri", "Anish Gupta", "Ariel Shen",
    "Aryaman Khanna", "Asim Ali", "Audrey Zhang", "Avy", "Howard Meng",
    "Clara Tu", "Damon Huynh", "Daniel Ng", "Daniel Samony", "Davyn Paringkoan",
    "Deleena Trisha Ghosh", "Denver Nguyen", "Derek Luan", "Dylan Dang",
    "Dylan Hopkins", "Dylan Huynh", "Elena Vasquez", "Emma Lee",
    "Erfan Kaden Ballew", "Eric Liu", "Esther Luan", "Eugene Chao",
    "Hailey Kim", "Henry Speiser", "Ichchitaa Sawrikar", "Ivan Mao",
    "Jojo siWANG", "Joshua Chuang", "Joying Yang", "Justin Shen",
    "Karan Agarwal", "Karan Dhir", "Kat Bernabe", "Kelley",
    "Kevin Junxian Lan", "Kristen Chen", "Leon Jia", "Prisha", "Qishen Luo",
    "Rachel Hu", "Rahul Kaparaboyna", "Rakhi", "Richard Wei",
    "Rishabh Abhishetty", "Rithvik Agastya", "Rohan",
]


def random_dob() -> str:
    start = date(1950, 1, 1)
    end = date(2005, 12, 31)
    delta_days = (end - start).days
    return (start + timedelta(days=random.randint(0, delta_days))).isoformat()


def random_next_visit() -> str:
    today = date(2026, 6, 21)
    return (today + timedelta(days=random.randint(5, 120))).isoformat()


def build_patient_record(name: str, patient_id: str) -> dict:
    condition = random.choice(CONDITIONS)
    status = random.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0]

    record = {
        "patient_id": patient_id,
        "name": name,
        "dob": random_dob(),
        "condition": condition,
        "status": status,
        "next_visit": random_next_visit(),
        "flagged": random.random() < 0.15,  # ~15% flagged, matches a realistic minority
    }

    if status == "No Check-ins":
        record["check_in_count"] = 0
        record["status_detail"] = "Awaiting patient updates"
    elif status == "No Interim":
        record["check_in_count"] = random.randint(3, 12)
        record["status_detail"] = f"{record['check_in_count']} check-ins available"
    elif status == "Needs Review":
        record["check_in_count"] = random.randint(8, 20)
        new_since = random.randint(1, 5)
        record["status_detail"] = f"{new_since} new check-ins since last Interim"
    else:  # Interim Ready
        record["check_in_count"] = random.randint(8, 25)
        record["status_detail"] = f"{record['check_in_count']} check-ins"

    return record


def save_patient_directory_entry(record: dict):
    key = f"patient:{record['patient_id']}"
    r.set(key, json.dumps(record))
    r.sadd("patient_directory", key)  # set of all patient keys, for easy listing


def generate_fake_patients(n: int = 30):
    print(f"Using {min(n, len(NAMES))} names from the provided list...\n")
    names = NAMES[:n] if n <= len(NAMES) else NAMES + [f"Patient {i}" for i in range(n - len(NAMES))]

    for i, name in enumerate(names):
        patient_id = name.lower().replace(" ", "_").replace(".", "") + f"_{i}"
        record = build_patient_record(name, patient_id)
        save_patient_directory_entry(record)
        print(f"Saved: {record['name']} | {record['condition']} | {record['status']}")

    print(f"\nDone. {len(names)} fake patients saved to Redis under 'patient_directory'.")


if __name__ == "__main__":
    generate_fake_patients(n=30)
