import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import UploadPage from "./pages/Upload";
import GraphPage from "./pages/Graph";
import ReportPage from "./pages/Report";
import SettingsPage from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Upload Landing Page */}
        <Route path="/" element={<UploadPage />} />
        
        {/* Graph Analysis Dashboard */}
        <Route path="/analyze" element={<GraphPage />} />
        
        {/* Printable Security Report */}
        <Route path="/report" element={<ReportPage />} />
        
        {/* Settings Console */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Fallback to Upload */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
