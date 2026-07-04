import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useVektraStore } from "./store/vektraStore";
import LoginPage from "./pages/Login";
import UploadPage from "./pages/Upload";
import GraphPage from "./pages/Graph";
import ReportPage from "./pages/Report";
import SettingsPage from "./pages/Settings";
import TestLabPage from "./pages/TestLab";

function ProtectedRoute({ children }) {
  const currentUser = useVektraStore((state) => state.currentUser);
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
        
        <Route path="/analyze" element={<ProtectedRoute><GraphPage /></ProtectedRoute>} />
        
        <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path="/test-lab" element={<ProtectedRoute><TestLabPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
