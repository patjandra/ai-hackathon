import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { WhyThisVisitMatters } from "../components/WhyThisVisitMatters";
import { MetricCards } from "../components/MetricCards";
import { PainChart } from "../components/PainChart";
import { SparklineRow } from "../components/SparklineRow";
import { KeyEvents } from "../components/KeyEvents";
import { PatientQuote } from "../components/PatientQuote";
import type { Patient, PhysicianSummary, CheckIn } from "../lib/types";

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-gray-400">
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-sm">Generating briefing…</span>
    </div>
  );
}

export default function DoctorDashboard() {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PhysicianSummary | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, s, c] = await Promise.all([
        api.getPatient(patientId!),
        api.getSummary(patientId!),
        api.getCheckins(patientId!),
      ]);
      setPatient(p);
      setSummary(s);
      setCheckins(c);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [patientId]);

  const handleSeed = async () => {
    setSeeding(true);
    try { await api.seedDemo(); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setSeeding(false); }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        {error.includes("not found") && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            {seeding ? "Seeding…" : "Load Sarah Chen demo data"}
          </button>
        )}
      </div>
    );
  }

  if (!summary || !patient) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* ── Patient header ── */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{patient.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{patient.diagnosis}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Next visit</p>
          <p className="text-sm text-gray-700 font-medium">{fmtDate(patient.nextAppointment)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {summary.checkInCount} check-ins · {fmtDate(summary.dateRange.from)} – {fmtDate(summary.dateRange.to)}
          </p>
        </div>
      </div>

      {/* ── 1. Why This Visit Matters ── */}
      <WhyThisVisitMatters
        trajectory={summary.whyThisVisitMatters.trajectory}
        focusAreas={summary.whyThisVisitMatters.focusAreas}
      />

      {/* ── 2. Metric cards — 5-up scan row ── */}
      <MetricCards metricSummary={summary.metricSummary} />

      {/* ── 3. Pain chart (full width, events overlaid) ── */}
      <PainChart checkins={checkins} keyEvents={summary.keyEvents} />

      {/* ── 4. Sparklines — fatigue / stiffness / swelling ── */}
      <SparklineRow checkins={checkins} />

      {/* ── 5. Key events — collapsed by default, source-expandable ── */}
      <KeyEvents events={summary.keyEvents} checkins={checkins} />

      {/* ── 6. Patient quote ── */}
      {summary.patientQuote && (
        <PatientQuote quote={summary.patientQuote} date={summary.patientQuoteDate} />
      )}
    </div>
  );
}
