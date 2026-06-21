import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import PatientCheckin from "./pages/PatientCheckin";
import DoctorDashboard from "./pages/DoctorDashboard";

const DEMO_ID = "demo-sarah-chen-ra";

function Nav() {
  const { pathname } = useLocation();
  const isDoctor = pathname.startsWith("/doctor");
  const isPatient = pathname.startsWith("/patient");

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <img src="/logo.png" alt="Interim" className="h-32 w-auto" />
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <a
          href={`/patient/${DEMO_ID}`}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            isPatient ? "bg-white shadow-sm text-teal-700" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Patient
        </a>
        <a
          href={`/doctor/${DEMO_ID}`}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            isDoctor ? "bg-white shadow-sm text-teal-700" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Doctor
        </a>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to={`/doctor/${DEMO_ID}`} replace />} />
        <Route path="/patient/:patientId" element={<PatientCheckin />} />
        <Route path="/doctor/:patientId" element={<DoctorDashboard />} />
      </Routes>
    </>
  );
}
