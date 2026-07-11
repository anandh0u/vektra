import React from "react";
import { useVektraStore } from "../store/vektraStore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import GraphCanvas from "../components/GraphCanvas";
import RightPanel from "../components/RightPanel";
import StatCard from "../components/StatCard";
import { 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  Activity, 
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function GraphPage() {
  const { 
    stats, 
    conflicts, 
    nodes, 
    analysisTier,
    upgradePrompt,
    selectConflict 
  } = useVektraStore();

  const {
    risk_score,
    executive_summary,
    risk_label,
    compliance_notes
  } = stats;

  const critCount = conflicts.filter(c => c.severity === "CRITICAL").length;
  const warnCount = conflicts.filter(c => c.severity === "WARNING").length;
  const infoCount = conflicts.filter(c => c.severity === "INFO").length;

  let riskLabel = risk_label || "LOW";
  if (risk_score >= 80) {
    riskLabel = "CRITICAL";
  } else if (risk_score >= 50) {
    riskLabel = "HIGH";
  } else if (risk_score >= 20) {
    riskLabel = "MEDIUM";
  }

  const handleCategoryClick = (severity) => {
    const target = conflicts.find(c => c.severity === severity);
    if (target) {
      selectConflict(target.id);
    }
  };

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      
      {/* ── LEFT COLUMN (Sidebar) ── */}
      <Sidebar />

      {/* ── CENTER COLUMN + RIGHT COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top bar */}
        <TopBar />

        {/* Workspace layout split */}
        <div className="flex-1 flex min-w-0">
          
          {/* Main Dashboard Canvas Column */}
          <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto min-w-0">
            
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-textMain tracking-tight uppercase">
                  Policy Graph Analysis
                </h2>
                <p className="text-[10px] text-muted font-mono mt-0.5 tracking-wider uppercase">
                  Neo4j Aura relationship graph traversal · {(analysisTier || "free").toUpperCase()} tier
                </p>
              </div>
              
              {/* Risk Gauge */}
              {(() => {
                const radius = 16;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (risk_score / 100) * circumference;

                let strokeColor = "#4C8DFF"; // signal-blue
                let textColor = "text-primary";
                if (risk_score >= 80) {
                  strokeColor = "#FF5C4D"; // alert-red
                  textColor = "text-danger";
                } else if (risk_score >= 50) {
                  strokeColor = "#F2A94B"; // warn-amber
                  textColor = "text-warning";
                }

                return (
                  <div className="flex items-center gap-3 bg-cardSurface border border-cardBorder rounded-[6px] px-4 py-2">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="16"
                          cy="16"
                          r={radius}
                          className="stroke-pageBg"
                          strokeWidth="2.5"
                          fill="transparent"
                        />
                        <circle
                          cx="16"
                          cy="16"
                          r={radius}
                          stroke={strokeColor}
                          strokeWidth="2.5"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      <span className="absolute text-[8px] font-bold font-mono text-textMain">
                        {risk_score}%
                      </span>
                    </div>
                    <div>
                      <div className="text-[8px] uppercase font-bold text-muted tracking-wider">Overall Posture</div>
                      <div className={`text-[10px] font-bold font-mono ${textColor}`}>
                        {riskLabel} RISK
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Executive Summary Bar */}
            {executive_summary && (
              <div className="bg-cardSurface border border-cardBorder border-l-2 border-l-primary rounded-[6px] p-4 flex items-start gap-3">
                <Sparkles className="w-4.5 h-4.5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-0.5 font-mono">
                    {upgradePrompt ? "Basic Graph Summary" : "Executive Summary (Agent 3 Scorer)"}
                  </span>
                  <p className="text-xs text-textMain leading-relaxed font-normal">
                    {executive_summary}
                  </p>
                  {compliance_notes && (
                    <p className="text-[10px] text-muted mt-1.5 leading-relaxed font-mono">
                      {compliance_notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Vulnerability category cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Critical Card */}
              <button
                onClick={() => handleCategoryClick("CRITICAL")}
                className={`bg-cardSurface border p-4 rounded-[6px] text-left transition-fast group flex justify-between items-center ${
                  critCount > 0 ? "border-[#FF5C4D]/30 hover:border-[#FF5C4D]/60" : "border-cardBorder hover:border-muted/30"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted">
                    <ShieldAlert className={`w-4 h-4 ${critCount > 0 ? "text-[#FF5C4D]" : "text-muted"}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Criticals</span>
                  </div>
                  <div className={`text-2xl font-bold font-sans tracking-tight ${critCount > 0 ? "text-[#FF5C4D]" : "text-textMain"}`}>{critCount}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#FF5C4D] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-fast" />
              </button>

              {/* Warning Card */}
              <button
                onClick={() => handleCategoryClick("WARNING")}
                className={`bg-cardSurface border p-4 rounded-[6px] text-left transition-fast group flex justify-between items-center ${
                  warnCount > 0 ? "border-[#F2A94B]/30 hover:border-[#F2A94B]/60" : "border-cardBorder hover:border-muted/30"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted">
                    <AlertTriangle className={`w-4 h-4 ${warnCount > 0 ? "text-[#F2A94B]" : "text-muted"}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Warnings</span>
                  </div>
                  <div className={`text-2xl font-bold font-sans tracking-tight ${warnCount > 0 ? "text-[#F2A94B]" : "text-textMain"}`}>{warnCount}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#F2A94B] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-fast" />
              </button>

              {/* Info Card */}
              <button
                onClick={() => handleCategoryClick("INFO")}
                className="bg-cardSurface border border-cardBorder hover:border-muted/30 p-4 rounded-[6px] text-left transition-fast group flex justify-between items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Info Logs</span>
                  </div>
                  <div className="text-2xl font-bold font-sans tracking-tight text-textMain">{infoCount}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-fast" />
              </button>

            </div>

            {/* React Flow Graph Canvas Area */}
            <div className="flex-1 min-h-[350px]">
              <GraphCanvas />
            </div>

            {/* Bottom Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                title="Rules Parsed" 
                value={nodes.length} 
                icon={Layers} 
              />
              <StatCard 
                title="Critical Findings" 
                value={critCount} 
                icon={ShieldAlert}
                severity={critCount > 0 ? "CRITICAL" : "SAFE"}
                trend={critCount > 0 ? `▲ ${critCount} critical` : "none"}
              />
              <StatCard 
                title="Warnings" 
                value={warnCount} 
                icon={AlertTriangle}
                severity={warnCount > 0 ? "WARNING" : "SAFE"}
                trend={warnCount > 0 ? `▲ ${warnCount} warning` : "none"}
              />
              <StatCard 
                title="Calculated Risk" 
                value={`${risk_score}%`} 
                icon={Activity}
                severity={risk_score >= 80 ? "CRITICAL" : (risk_score >= 20 ? "WARNING" : "SAFE")}
              />
            </div>

          </div>

          {/* ── RIGHT COLUMN (Details & Chat) ── */}
          <RightPanel />

        </div>

      </div>

    </div>
  );
}
