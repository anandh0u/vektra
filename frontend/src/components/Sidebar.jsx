import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import { 
  Shield, 
  Upload as UploadIcon, 
  Network, 
  FileText, 
  Settings as SettingsIcon, 
  Loader2, 
  Check, 
  X, 
  Database
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    agentStatus, 
    recentAnalyses, 
    loadRecentAnalysis,
    sessionId
  } = useVektraStore();

  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    // Check Neo4j health status
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    fetch(`${API_BASE}/api/health`)
      .then(res => res.json())
      .then(data => setDbConnected(data.neo4j))
      .catch(() => setDbConnected(false));
  }, [sessionId]);

  const navItems = [
    { label: "Upload Policy", path: "/", icon: UploadIcon },
    { label: "Graph Canvas", path: "/analyze", icon: Network },
    { label: "Security Report", path: "/report", icon: FileText },
    { label: "Settings", path: "/settings", icon: SettingsIcon },
  ];

  const handleRecentClick = (analysis) => {
    loadRecentAnalysis(analysis);
    navigate("/analyze");
  };

  return (
    <aside className="w-60 bg-[#0a0c16] border-r border-[#1e2240] flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#1e2240] gap-2">
        <div className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-lg">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="font-heading font-bold text-xl tracking-wider bg-gradient-to-r from-white via-slate-200 to-secondary bg-clip-text text-transparent">
          VEKTRA
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <span className="px-3 text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">
          Navigation
        </span>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-[#1e2240] text-white border-l-2 border-primary" 
                  : "text-muted hover:bg-[#141628] hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? "text-primary" : "text-muted"}`} />
              {item.label}
            </Link>
          );
        })}

        {/* Recent Analyses */}
        <div className="pt-6">
          <span className="px-3 text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">
            Recent Analyses
          </span>
          {recentAnalyses.length === 0 ? (
            <span className="px-3 text-xs text-muted/60 italic block">None yet</span>
          ) : (
            <div className="space-y-1">
              {recentAnalyses.slice(0, 3).map((analysis, idx) => (
                <button
                  key={analysis.session_id || idx}
                  onClick={() => handleRecentClick(analysis)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted hover:bg-[#141628] hover:text-slate-200 truncate transition-all duration-200 block"
                >
                  <div className="font-semibold text-slate-300 truncate">
                    {analysis.format} Policy ({analysis.total_rules} rules)
                  </div>
                  <div className="text-[10px] text-muted/80">{analysis.timestamp}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Agents Live Panel */}
        <div className="pt-6">
          <span className="px-3 text-[10px] font-bold text-muted uppercase tracking-wider block mb-3">
            Autonomous Agents
          </span>
          <div className="space-y-2">
            {/* Agent 1 */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Vulnerability Analyst</div>
                <div className="text-[9px] text-muted">Agent 1: Vulnerability evaluation</div>
              </div>
              <div>
                {agentStatus.analyst === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {agentStatus.analyst === "completed" && <Check className="w-4 h-4 text-safe" />}
                {agentStatus.analyst === "failed" && <X className="w-4 h-4 text-danger" />}
                {agentStatus.analyst === "idle" && <div className="w-2 h-2 rounded-full bg-muted/30" />}
              </div>
            </div>

            {/* Agent 2 */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Fix Engineer</div>
                <div className="text-[9px] text-muted">Agent 2: Remediation logic</div>
              </div>
              <div>
                {agentStatus.advisor === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {agentStatus.advisor === "completed" && <Check className="w-4 h-4 text-safe" />}
                {agentStatus.advisor === "failed" && <X className="w-4 h-4 text-danger" />}
                {agentStatus.advisor === "idle" && <div className="w-2 h-2 rounded-full bg-muted/30" />}
              </div>
            </div>

            {/* Agent 3 */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Risk Scorer</div>
                <div className="text-[9px] text-muted">Agent 3: Policy assessment</div>
              </div>
              <div>
                {agentStatus.scorer === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {agentStatus.scorer === "completed" && <Check className="w-4 h-4 text-safe" />}
                {agentStatus.scorer === "failed" && <X className="w-4 h-4 text-danger" />}
                {agentStatus.scorer === "idle" && <div className="w-2 h-2 rounded-full bg-muted/30" />}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Database connection dot */}
      <div className="h-14 border-t border-[#1e2240] flex items-center px-6 justify-between bg-[#08080e]">
        <div className="flex items-center gap-2">
          <Database className={`w-4 h-4 ${dbConnected ? "text-safe" : "text-muted"}`} />
          <span className="text-xs font-medium text-slate-300">
            Neo4j {dbConnected ? "Connected" : "Offline"}
          </span>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${dbConnected ? "bg-safe shadow-[0_0_10px_#10b981]" : "bg-muted/50"}`} />
      </div>
    </aside>
  );
}
