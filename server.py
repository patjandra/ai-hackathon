"""
FastAPI server — exposes the extraction/storage pipeline as HTTP endpoints.

Run with: uvicorn server:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import redis_storage as rs
import report_generation as rg

app = FastAPI(title="Patient History API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CheckinRequest(BaseModel):
    user_id: str
    date: str          # "YYYY-MM-DD"
    text: str
    input_mode: str = "text"  # "text" or "voice"


@app.get("/")
def root():
    return {"status": "ok"}


@app.post("/api/checkin")
def do_checkin(req: CheckinRequest):
    try:
        key = rs.check_in(req.user_id, req.date, req.text, req.input_mode)
        insight = rs.generate_instant_insight(req.user_id)
        return {"key": key, "insight": insight}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    return rs.get_user_history(user_id)


@app.get("/api/trends/{user_id}")
def get_trends(user_id: str):
    history = rs.get_user_history(user_id)
    return rg.extract_trends(history)


@app.get("/api/report/{user_id}")
def get_report(user_id: str):
    history = rs.get_user_history(user_id)
    if not history:
        raise HTTPException(status_code=404, detail="No check-in history found for this patient.")
    return rg.generate_doctor_report(user_id, history)
