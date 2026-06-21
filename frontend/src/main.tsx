import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import PatientCheckin from "./pages/PatientCheckin";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorDirectory from "./pages/DoctorDirectory";
import DemoSetup from "./pages/DemoSetup";
import LandingPage from "./pages/LandingPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PatientCheckin loginOnly />} />
        <Route path="/patient" element={<PatientCheckin />} />
        <Route path="/doctor" element={<DoctorDirectory />} />
        <Route path="/doctor/:patientId" element={<DoctorDashboard />} />
        <Route path="/demo" element={<DemoSetup />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
