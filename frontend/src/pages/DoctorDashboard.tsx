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

  if (error) return <div className="p-8 text-rose-600">Failed to load: {error}</div>;
  if (!patient || !summary) return <div className="p-8 text-slate-500">Loading briefing…</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-5">
        <header className="bg-white rounded-xl shadow-sm p-5">
          <h1 className="text-2xl font-bold text-slate-800">
            {patient.name} · {patient.diagnosis}
          </h1>
          <p className="text-slate-500">
            Next visit: {fmt(patient.nextAppointment)} · {summary.checkInCount} check-ins since {fmt(patient.lastAppointment)}
          </p>
        </header>

        <WhyThisVisitMatters data={summary.whyThisVisitMatters} />
        <SummaryCard summary={summary} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MetricChart checkins={checkins} />
          <KeyEvents events={summary.keyEvents} />
        </div>

        <PatientQuote quote={summary.patientQuote} date={summary.patientQuoteDate} />
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
