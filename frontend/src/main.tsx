import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import PatientCheckin from "./pages/PatientCheckin";
import DoctorDashboard from "./pages/DoctorDashboard";
import DemoSetup from "./pages/DemoSetup";

const DEMO_ID = import.meta.env.VITE_DEMO_PATIENT_ID ?? "demo-sarah-chen-ra";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/patient" replace />} />
        <Route path="/patient" element={<PatientCheckin />} />
        <Route path="/doctor/:patientId" element={<DoctorDashboard />} />
        <Route path="/doctor" element={<Navigate to={`/doctor/${DEMO_ID}`} replace />} />
        <Route path="/demo" element={<DemoSetup />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
