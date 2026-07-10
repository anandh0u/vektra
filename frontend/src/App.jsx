import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useVektraStore } from "./store/vektraStore";
import UploadPage from "./pages/Upload";
import GraphPage from "./pages/Graph";
import ReportPage from "./pages/Report";
import SettingsPage from "./pages/Settings";
import LoginPage from "./pages/Login";
import PricingPage from "./pages/Pricing";
import HistoryPage from "./pages/History";
import DashboardPage from "./pages/Dashboard";
import WalletPage from "./pages/Wallet";
import AnalyzingPage from "./pages/Analyzing";
import WorkflowEvidencePage from "./pages/WorkflowEvidence";
import AccountsPage from "./pages/Accounts";
import RiskAssessmentPage from "./pages/RiskAssessment";
import CompliancePage from "./pages/Compliance";
import ChatbotPage from "./pages/ChatbotPage";
import Investigate from "./pages/Investigate";
import ForensicTimeline from "./pages/ForensicTimeline";

function ProtectedRoute({ children }) {
  const { currentUser } = useVektraStore();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { refreshCurrentUser } = useVektraStore();

  useEffect(() => {
    const savedTheme = localStorage.getItem("vektra_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    
    // Apply custom primary/secondary colors if set
    const savedPrimary = localStorage.getItem("vektra_color_primary");
    const savedSecondary = localStorage.getItem("vektra_color_secondary");
    if (savedPrimary) document.documentElement.style.setProperty("--color-primary", savedPrimary);
    if (savedSecondary) document.documentElement.style.setProperty("--color-secondary", savedSecondary);

    // Wake up backend in background on load
    const API_BASE =
      import.meta.env.VITE_API_URL ||
      (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? ""
        : "http://localhost:8000");
    fetch(`${API_BASE}/api/health`).catch(() => {});

    refreshCurrentUser();
  }, [refreshCurrentUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication Page */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Upload Landing Page */}
        <Route path="/" element={<UploadPage />} />

        {/* Workflow Progress Page */}
        <Route path="/analyzing/:sessionId" element={<AnalyzingPage />} />

        {/* Workflow Evidence Page */}
        <Route path="/workflow/:sessionId" element={<WorkflowEvidencePage />} />

        {/* Graph Analysis Dashboard */}
        <Route path="/analyze" element={<GraphPage />} />

        {/* Printable Security Report */}
        <Route path="/report" element={<ReportPage />} />

        {/* Legacy Credit Store */}
        <Route path="/store" element={<Navigate to="/pricing" replace />} />

        {/* Dashboard Console */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* Wallet Console */}
        <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />

        {/* Account Scan History */}
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

        {/* AWS Accounts Integration */}
        <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />

        {/* Risk Assessments & Heatmap Matrices */}
        <Route path="/risk" element={<ProtectedRoute><RiskAssessmentPage /></ProtectedRoute>} />

        {/* Compliance benchmarks checklists */}
        <Route path="/compliance" element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} />

        {/* Dedicated Chatbot Assistant page */}
        <Route path="/chatbot" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />

        {/* Settings Console */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* Forensic Ingestion Console */}
        <Route path="/investigate" element={<ProtectedRoute><Investigate /></ProtectedRoute>} />

        {/* Forensic Timeline Chronology */}
        <Route path="/timeline" element={<ProtectedRoute><ForensicTimeline /></ProtectedRoute>} />

        {/* Fallback to Upload */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
