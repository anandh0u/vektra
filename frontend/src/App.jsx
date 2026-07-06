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

        {/* Settings Console */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* Fallback to Upload */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
