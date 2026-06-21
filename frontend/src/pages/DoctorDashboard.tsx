import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { CheckIn, Patient, PhysicianSummary } from "../../../shared/types";
import WhyThisVisitMatters from "../components/WhyThisVisitMatters";
import SummaryCard from "../components/SummaryCard";
import MetricChart from "../components/MetricChart";
import KeyEvents from "../components/KeyEvents";
import PatientQuote from "../components/PatientQuote";

export default function DoctorDashboard() {
  const { patientId = "" } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PhysicianSummary | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Two pulls: /summary (LLM narrative) and /checkins (raw series for chart).
    Promise.all([api.patient(patientId), api.summary(patientId), api.checkins(patientId)])
      .then(([p, s, c]) => {
        setPatient(p);
        setSummary(s);
        setCheckins(c);
      })
      .catch((e) => setError(String(e)));
  }, [patientId]);

  if (error)
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="card px-6 py-5 text-rose-600">Failed to load: {error}</div>
      </div>
    );
  if (!patient || !summary)
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-ink-500">
          <span className="w-5 h-5 rounded-full border-2 border-clay border-t-indigo-500 animate-spin" />
          Preparing briefing…
        </div>
      </div>
    );

  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="min-h-screen px-5 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center gap-3.5 px-1 mb-1 animate-fade-up">
          <div className="w-11 h-11 rounded-xl bg-indigo-500 text-white grid place-items-center text-sm font-medium shadow-soft shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink-900 truncate leading-tight">
              {patient.name}
            </h1>
            <p className="text-[13px] text-ink-500 leading-tight">
              {patient.diagnosis}
              <span className="text-ink-400"> · </span>
              <span className="text-ink-700 font-medium">{summary.checkInCount} check-ins</span> since {fmt(patient.lastAppointment)}
              <span className="text-ink-400"> · </span>
              Next visit {fmt(patient.nextAppointment)}
            </p>
          </div>
        </header>

        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <WhyThisVisitMatters data={summary.whyThisVisitMatters} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <SummaryCard summary={summary} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
            <MetricChart checkins={checkins} />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
            <KeyEvents events={summary.keyEvents} />
          </div>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
          <PatientQuote quote={summary.patientQuote} date={summary.patientQuoteDate} />
        </div>
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
