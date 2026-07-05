import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuthHeaders, useVektraStore } from "../store/vektraStore";
import { 
  Shield, 
  Home, 
  Search, 
  Network, 
  History as HistoryIcon, 
  FileText, 
  Gem, 
  Coins, 
  Settings as SettingsIcon, 
  LogOut
} from "lucide-react";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return "just now";
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    loadRecentAnalysis,
    sessionId,
    currentUser,
    signOut,
    nodes
  } = useVektraStore();

  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    fetch(`${API_BASE}/api/history`, { headers: getAuthHeaders() })
      .then(r => {
        if (r.status === 401) {
          signOut();
          throw new Error("Session expired");
        }
        return r.json();
      })
      .then(data => setScanHistory(data.history || []))
      .catch(() => setScanHistory([]));
  }, [sessionId, currentUser, signOut]);

  const handleHistoryClick = async (session_id) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${API_BASE}/api/report/${session_id}`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.report_json) {
        loadRecentAnalysis(data.report_json);
        navigate("/report");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hasScan = nodes && nodes.length > 0;
  const tier = (currentUser?.tier || "free").toLowerCase();
  const credits = currentUser?.credits_balance ?? 0;
  const totalCredits = tier === "free" ? 5 : (tier === "pro" ? 200 : 1000);

  // Define nav links per requirements
  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: Home, show: !!currentUser },
    { label: "Analyze", path: "/", icon: Search, show: true },
    { label: "Graph", path: "/analyze", icon: Network, show: hasScan },
    { label: "History", path: "/history", icon: HistoryIcon, show: !!currentUser },
    { label: "Reports", path: "/report", icon: FileText, show: hasScan },
    { label: "Wallet", path: "/wallet", icon: Gem, show: !!currentUser },
    { label: "Pricing", path: "/pricing", icon: Coins, show: true },
    { label: "Settings", path: "/settings", icon: SettingsIcon, show: !!currentUser },
  ];

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <aside className="w-60 bg-[#0a0c16] border-r border-[#1e2240] flex flex-col h-screen select-none shrink-0">
      
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#1e2240] gap-2">
        <div className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-lg">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span 
          onClick={() => currentUser ? navigate("/dashboard") : navigate("/")}
          className="font-heading font-bold text-xl tracking-wider bg-gradient-to-r from-white via-slate-200 to-secondary bg-clip-text text-transparent cursor-pointer"
        >
          VEKTRA
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <span className="px-3 text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">
          Navigation
        </span>
        {navItems.map((item) => {
          if (!item.show) return null;
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-muted hover:bg-[#141628] hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? "text-white" : "text-muted"}`} />
              {item.label}
            </Link>
          );
        })}

        {/* Scan History (only if logged in and has history) */}
        {currentUser && scanHistory.length > 0 && (
          <div className="pt-6">
            <span className="px-3 text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">
              Scan Logs
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto px-1">
              {scanHistory.slice(0, 5).map((item, idx) => {
                const format = (item.format || "").toUpperCase();
                const riskLabel = (item.risk_label || "LOW").toUpperCase();
                
                let riskBadgeStyle = "bg-safe/10 text-safe border-safe/20";
                if (riskLabel === "CRITICAL" || riskLabel === "HIGH") {
                  riskBadgeStyle = "bg-danger/10 text-danger border-danger/20";
                } else if (riskLabel === "WARNING" || riskLabel === "MEDIUM") {
                  riskBadgeStyle = "bg-warning/10 text-warning border-warning/20";
                }

                return (
                  <button
                    key={item.session_id || idx}
                    onClick={() => handleHistoryClick(item.session_id)}
                    className="w-full text-left p-2 rounded-lg bg-[#141628]/40 border border-[#1e2240]/40 hover:bg-[#141628] hover:border-[#1e2240] transition-all duration-200 block space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#1e2240] text-slate-300">
                        {format}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${riskBadgeStyle}`}>
                        {riskLabel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono truncate">
                      {item.policy_preview || "No preview"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Footer Section */}
      <div className="mt-auto border-t border-[#1e2240]/60 p-4 bg-[#0a0c16]/80 space-y-3">
        {currentUser && (
          <div className="space-y-3">
            {/* User Card */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xs text-primary shrink-0 shadow-[0_0_10px_rgba(124,58,237,0.15)]">
                {initials}
              </div>
              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-200 truncate">{currentUser.name || "Operator"}</div>
                <span className="inline-block rounded-full bg-primary/10 text-primary border border-primary/20 text-[8px] font-extrabold px-1.5 py-0.2 tracking-wider uppercase font-mono mt-0.5">
                  {tier}
                </span>
              </div>
            </div>

            {/* Credits progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-[#0d0f1a] h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (credits / totalCredits) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-bold text-muted">
                <span>{credits} CREDITS LEFT</span>
                <span>{totalCredits} max</span>
              </div>
            </div>
          </div>
        )}

        {/* Brand details */}
        <div className="flex justify-between items-center px-1 text-[10px] text-muted/60 font-mono pt-1">
          <span>VEKTRA v1.0.0</span>
          <span>HACKHAZARDS '26</span>
        </div>
      </div>

    </aside>
  );
}
