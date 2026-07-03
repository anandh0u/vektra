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
  Award,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function GraphPage() {
  const { 
    stats, 
    conflicts, 
    nodes, 
    selectConflict 
  } = useVektraStore();

  const {
    risk_score,
    executive_summary,
    risk_label,
    compliance_notes
  } = stats;

  // Count instances by severity
  const critCount = conflicts.filter(c => c.severity === "CRITICAL").length;
  const warnCount = conflicts.filter(c => c.severity === "WARNING").length;
  const infoCount = conflicts.filter(c => c.severity === "INFO").length;

  // Color badge for risk score
  let riskColorClass = "border-safe text-safe bg-safe/10";
  let riskLabel = risk_label || "LOW";
  if (risk_score >= 80) {
    riskColorClass = "border-danger text-danger bg-danger/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
    riskLabel = "CRITICAL";
  } else if (risk_score >= 50) {
    riskColorClass = "border-warning text-warning bg-warning/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
    riskLabel = "HIGH";
  } else if (risk_score >= 20) {
    riskColorClass = "border-yellow-400 text-yellow-300 bg-yellow-400/10";
    riskLabel = "MEDIUM";
  }

  // Handle clicking a category card to select the first vulnerability of that type
  const handleCategoryClick = (severity) => {
    const target = conflicts.find(c => c.severity === severity);
    if (target) {
      selectConflict(target.id);
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans select-none">
      
      {/* ── LEFT COLUMN (Sidebar) ── */}
      <Sidebar />

      {/* ── CENTER COLUMN + RIGHT COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top bar */}
        <TopBar />

        {/* Workspace layout split */}
        <div className="flex-1 flex min-w-0">
          
          {/* Main Dashboard Canvas Column */}
          <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto min-w-0">
            
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-2xl text-slate-100">
                  Policy Graph Analysis
                </h2>
                <p className="text-[10px] text-muted font-medium mt-0.5 tracking-wider uppercase">
                  Neo4j Aura relationship graph traversal
                </p>
              </div>
              
              {/* Risk Badge */}
              <div className={`px-4 py-1.5 rounded-lg border font-heading font-bold text-xs flex items-center gap-2 ${riskColorClass}`}>
                <Award className="w-4.5 h-4.5" />
                <span>RISK SCORE: {risk_score} · {riskLabel}</span>
              </div>
            </div>

            {/* Executive Summary Bar */}
            {executive_summary && (
              <div className="bg-[#141628] border border-[#1e2240] border-l-4 border-l-warning rounded-xl p-4 flex items-start gap-3 shadow-md">
                <Sparkles className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-0.5">
                    Executive Summary (Agent 3 Scorer)
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {executive_summary}
                  </p>
                  {compliance_notes && (
                    <p className="text-[10px] text-muted mt-1.5 leading-relaxed">
                      {compliance_notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Vulnerability category cards */}
            <div className="grid grid-cols-3 gap-4">
              
              {/* Critical Card */}
              <button
                onClick={() => handleCategoryClick("CRITICAL")}
                className="bg-gradient-to-r from-danger/20 to-danger/5 border border-danger/20 hover:border-danger/50 p-4 rounded-xl text-left transition-all duration-300 group flex justify-between items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-danger">
                    <ShieldAlert className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Criticals</span>
                  </div>
                  <div className="text-2xl font-bold font-heading text-slate-100">{critCount}</div>
                </div>
                <ArrowRight className="w-5 h-5 text-danger opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </button>

              {/* Warning Card */}
              <button
                onClick={() => handleCategoryClick("WARNING")}
                className="bg-gradient-to-r from-warning/20 to-warning/5 border border-warning/20 hover:border-warning/50 p-4 rounded-xl text-left transition-all duration-300 group flex justify-between items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Warnings</span>
                  </div>
                  <div className="text-2xl font-bold font-heading text-slate-100">{warnCount}</div>
                </div>
                <ArrowRight className="w-5 h-5 text-warning opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </button>

              {/* Info Card */}
              <button
                onClick={() => handleCategoryClick("INFO")}
                className="bg-gradient-to-r from-blue-500/20 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/50 p-4 rounded-xl text-left transition-all duration-300 group flex justify-between items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Info className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Info Logs</span>
                  </div>
                  <div className="text-2xl font-bold font-heading text-slate-100">{infoCount}</div>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
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
