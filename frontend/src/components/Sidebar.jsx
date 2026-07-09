import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuthHeaders, useVektraStore } from "../store/vektraStore";
import { 
  Shield, 
  LayoutDashboard, 
  Cloud, 
  Network, 
  Activity, 
  FileCode, 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  Bot, 
  Settings as SettingsIcon, 
  Coins, 
  History as HistoryIcon,
  LogOut,
  X
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    loadRecentAnalysis,
    sessionId,
    currentUser,
    signOut,
    nodes,
    mobileSidebarOpen,
    setMobileSidebarOpen
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
        setMobileSidebarOpen(false);
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

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, show: !!currentUser },
    { label: "AWS Accounts", path: "/accounts", icon: Cloud, show: !!currentUser },
    { label: "IAM Analyzer", path: "/analyze", icon: Network, show: hasScan },
    { label: "Vulnerability Scanner", path: "/analyze", icon: Activity, show: hasScan },
    { label: "Policy Analyzer", path: "/", icon: FileCode, show: true },
    { label: "Risk Assessment", path: "/risk", icon: ShieldAlert, show: !!currentUser },
    { label: "Compliance", path: "/compliance", icon: ShieldCheck, show: !!currentUser },
    { label: "Reports", path: "/report", icon: FileText, show: hasScan },
    { label: "AI Chatbot", path: "/chatbot", icon: Bot, show: !!currentUser },
    { label: "Settings", path: "/settings", icon: SettingsIcon, show: !!currentUser },
  ];

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar Panel Drawer */}
      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-auto
        w-60 bg-sidebarBg border-r border-cardBorder flex flex-col h-screen select-none shrink-0
        transition-transform duration-300 ease-in-out
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-cardBorder">
          <div className="flex items-center gap-2.5">
            <div className="bg-bgElevated border border-cardBorder p-1.5 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span 
              onClick={() => {
                setMobileSidebarOpen(false);
                if (currentUser) navigate("/dashboard");
                else navigate("/");
              }}
              className="font-sans font-bold text-base tracking-wide text-textMain cursor-pointer hover:opacity-80 transition-opacity"
            >
              VEKTRA
            </span>
          </div>
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-muted hover:text-textMain hover:bg-cardSurface border border-cardBorder rounded-[6px] transition-fast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">
              Vulnerability Center
            </span>
            {navItems.map((item) => {
              if (!item.show) return null;
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-fast ${
                    isActive 
                      ? "bg-activeNav text-textMain border border-cardBorder" 
                      : "text-muted hover:bg-cardSurface hover:text-textMain border border-transparent"
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? "text-primary" : "text-muted"}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Scan History Section */}
          {currentUser && scanHistory.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="px-3 text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Recent Scan Logs
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto px-1">
                {scanHistory.slice(0, 4).map((item, idx) => {
                  const format = (item.format || "").toUpperCase();
                  const riskLabel = (item.risk_label || "LOW").toUpperCase();
                  
                  let riskBadgeStyle = "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20";
                  if (riskLabel === "CRITICAL" || riskLabel === "HIGH") {
                    riskBadgeStyle = "bg-danger/10 text-danger border-danger/20";
                  } else if (riskLabel === "WARNING" || riskLabel === "MEDIUM") {
                    riskBadgeStyle = "bg-warning/10 text-warning border-warning/20";
                  }

                  return (
                    <button
                      key={item.session_id || idx}
                      onClick={() => handleHistoryClick(item.session_id)}
                      className="w-full text-left p-2 rounded-lg bg-cardSurface/30 border border-cardBorder hover:bg-cardSurface/80 hover:border-muted/30 transition-fast block space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-1 py-0.2 rounded-full text-[8px] font-bold bg-bgElevated text-slate-300 uppercase tracking-wide">
                          {format}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold border ${riskBadgeStyle}`}>
                          {riskLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted font-mono truncate">
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
        <div className="mt-auto border-t border-cardBorder p-4 bg-sidebarBg space-y-3">
          {currentUser && (
            <div className="space-y-3">
              {/* User Card */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-bgElevated border border-cardBorder flex items-center justify-center font-bold text-xs text-textMain shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-textMain truncate">{currentUser.name || "Operator"}</div>
                  <span className="inline-block rounded-full bg-primary/10 text-primary border border-primary/20 text-[8px] font-bold px-1.5 py-0.2 tracking-wider uppercase font-mono mt-0.5">
                    {tier}
                  </span>
                </div>
              </div>

              {/* Credits progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-bgElevated h-1.5 rounded-full overflow-hidden border border-cardBorder">
                  <div 
                    className="bg-primary h-full rounded-full transition-fast"
                    style={{ width: `${Math.min(100, (credits / totalCredits) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-bold text-muted">
                  <span>{credits} / {totalCredits} CREDITS</span>
                  <span>DAILY RESET</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center text-[9px] text-muted/50 font-mono">
            <span>VEKTRA v1.0.0</span>
            <span>© 2026</span>
          </div>
        </div>

      </aside>
    </>
  );
}
