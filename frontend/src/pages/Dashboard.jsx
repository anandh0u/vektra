import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useVektraStore, getAuthHeaders } from "../store/vektraStore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { 
  Shield, 
  ArrowRight, 
  Sparkles, 
  Plus, 
  History, 
  Coins, 
  CheckCircle2, 
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  LineChart,
  Line
} from "recharts";

const SECURITY_TIPS = [
  "Always use resource-specific ARNs instead of wildcards (*) in IAM policies.",
  "Enable MFA for all IAM users with console access, especially admin accounts.",
  "Use IAM roles for EC2 instances instead of storing access keys on the instance.",
  "Regularly rotate IAM access keys — set a 90-day rotation policy.",
  "Use AWS Organizations SCPs to set permission guardrails across all accounts.",
  "Never attach AdministratorAccess policy to users directly — use roles with boundaries.",
  "In Kubernetes, avoid ClusterRoleBindings for namespace-scoped workloads.",
  "Grant least privilege — start with no permissions and add only what's needed.",
  "Use Condition keys in IAM policies to restrict access by IP, time, or MFA status.",
  "Audit your IAM policies quarterly using AWS Access Analyzer or VEKTRA."
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser, sessionId } = useVektraStore();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState("morning");

  // Rotating security tips
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * SECURITY_TIPS.length);
    setTipIndex(randomIdx);
  }, []);

  // Time based greeting
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setTimeOfDay("morning");
    else if (hours < 18) setTimeOfDay("afternoon");
    else setTimeOfDay("evening");
  }, []);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    setLoading(true);
    fetch(`${API_BASE}/api/history`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setHistoryItems(data.history || []))
      .catch(() => setHistoryItems([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const name = currentUser?.name || "Operator";
  const tier = (currentUser?.tier || "free").toLowerCase();
  const credits = currentUser?.credits_balance ?? 0;
  const isFree = tier === "free";

  // Calculate stats from history
  const totalScans = historyItems.length;
  const totalCritical = historyItems.reduce((acc, curr) => acc + (curr.critical_count || 0), 0);
  const totalWarnings = historyItems.reduce((acc, curr) => acc + (curr.warning_count || 0), 0);
  const totalInfo = historyItems.reduce((acc, curr) => acc + (curr.info_count || 0), 0);
  const totalFixes = totalCritical + totalWarnings; // Mock generated fixes count
  
  // Calculate remaining hours to midnight IST
  const getHoursToMidnightIST = () => {
    // Current time in IST (UTC+5.5)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (3600000 * 5.5));
    
    const midnight = new Date(istTime);
    midnight.setHours(24, 0, 0, 0);
    const diffMs = midnight - istTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, mins };
  };

  const [timeLeft, setTimeLeft] = useState(getHoursToMidnightIST());
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getHoursToMidnightIST());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const totalDailyAllowance = isFree ? 5 : (tier === "pro" ? 200 : 1000);

  // Recharts Chart Data (Vulnerability Breakdown of last 7 scans)
  const chartData = historyItems.slice(0, 7).reverse().map((item, index) => ({
    name: `Scan ${totalScans - 6 + index > 0 ? totalScans - 6 + index : index + 1}`,
    Critical: item.critical_count || 0,
    Warning: item.warning_count || 0,
    Info: item.info_count || 0,
  }));

  // Sparkline data (simple arrays for sparkline chart)
  const sparklineData1 = [5, 10, 8, 15, 20, 18, 22];
  const sparklineData2 = [2, 4, 3, 5, 8, 6, 9];
  const sparklineData3 = [1, 2, 2, 4, 6, 5, 7];
  const sparklineData4 = [10, 15, 13, 20, 25, 22, 28];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % SECURITY_TIPS.length);
  };

  const handleHistoryClick = async (session_id) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${API_BASE}/api/report/${session_id}`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.report_json) {
        useVektraStore.getState().loadRecentAnalysis(data.report_json);
        navigate("/report");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans select-none">
      {/* Sidebar */}
      <Sidebar />

      {/* Center + Right panels */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {/* Dashboard grid body */}
        <div className="flex-1 flex min-w-0">
          
          {/* Main Area */}
          <div className="flex-1 flex flex-col p-8 space-y-8 overflow-y-auto min-w-0">
            
            {/* Header / Greeting */}
            <div>
              <h1 className="font-heading text-3xl font-bold leading-tight text-white tracking-tight">
                Good {timeOfDay}, {name} 👋
              </h1>
              <p className="text-sm text-muted mt-1">
                You have <span className="text-primary font-bold">{credits} credits</span> remaining today.
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Scans */}
              <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden">
                <div>
                  <span className="text-xs text-muted block font-semibold">Total Scans</span>
                  <span className="text-3xl font-heading font-bold text-white mt-2 block">{totalScans}</span>
                </div>
                <div className="w-20 h-10 self-end opacity-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData1.map((v, i) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 2: Critical Found */}
              <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden">
                <div>
                  <span className="text-xs text-muted block font-semibold">Critical Found</span>
                  <span className="text-3xl font-heading font-bold text-danger mt-2 block">{totalCritical}</span>
                </div>
                <div className="w-20 h-10 self-end opacity-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData2.map((v, i) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 3: Fixes Generated */}
              <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden">
                <div>
                  <span className="text-xs text-muted block font-semibold">Fixes Generated</span>
                  <span className="text-3xl font-heading font-bold text-safe mt-2 block">{totalFixes}</span>
                </div>
                <div className="w-20 h-10 self-end opacity-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData3.map((v, i) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 4: Credits Used */}
              <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden">
                <div>
                  <span className="text-xs text-muted block font-semibold">Credits Balance</span>
                  <span className="text-3xl font-heading font-bold text-primary mt-2 block">{credits}</span>
                </div>
                <div className="w-20 h-10 self-end opacity-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData4.map((v, i) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h2 className="font-heading text-lg font-bold text-slate-100">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <button
                  onClick={() => navigate("/")}
                  className="bg-gradient-to-r from-primary to-secondary p-5 rounded-2xl text-left border border-primary/20 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all flex flex-col justify-between h-32"
                >
                  <Plus className="w-6 h-6 text-white" />
                  <div>
                    <h3 className="font-bold text-sm text-white">New Scan</h3>
                    <p className="text-[11px] text-white/80 mt-0.5">Upload a policy configuration</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/history")}
                  className="bg-[#141628] border border-[#1e2240] p-5 rounded-2xl text-left hover:border-primary/40 transition-all flex flex-col justify-between h-32"
                >
                  <History className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">View Reports</h3>
                    <p className="text-[11px] text-muted mt-0.5">Browse past policy scan reports</p>
                  </div>
                </button>

                {isFree ? (
                  <button
                    onClick={() => navigate("/pricing")}
                    className="bg-gradient-to-r from-secondary to-[#0c4a6e] p-5 rounded-2xl text-left border border-secondary/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all flex flex-col justify-between h-32"
                  >
                    <Sparkles className="w-6 h-6 text-cyan-200 animate-pulse" />
                    <div>
                      <h3 className="font-bold text-sm text-white">Upgrade Plan</h3>
                      <p className="text-[11px] text-white/80 mt-0.5">Get unlimited scans and AI agents</p>
                    </div>
                  </button>
                ) : (
                  <div className="bg-[#141628] border border-[#1e2240] p-5 rounded-2xl text-left flex flex-col justify-between h-32">
                    <Coins className="w-6 h-6 text-secondary" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-200">Wallet Console</h3>
                      <p className="text-[11px] text-muted mt-0.5">Manage credentials & credit tokens</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Recharts vulnerability breakdown */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-6 space-y-4">
              <h3 className="font-heading font-semibold text-sm text-slate-200">Vulnerability Trends (Last 7 scans)</h3>
              <div className="h-60 w-full">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted italic">
                    No scan data yet. Run scans to populate chart.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0a0c16", border: "1px solid #1e2240" }}
                        labelStyle={{ color: "#fff", fontWeight: "bold" }}
                      />
                      <Bar dataKey="Critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Warning" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Info" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Scans */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-slate-100">Recent Scans</h2>
                <Link to="/history" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  View all scans <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="text-xs text-muted py-6 text-center">Loading recent history...</div>
              ) : historyItems.length === 0 ? (
                <div className="bg-[#141628]/40 border border-[#1e2240] rounded-2xl p-8 text-center text-xs text-muted">
                  No scan history on your account. Upload a policy to get started!
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.slice(0, 5).map((item) => {
                    const fmt = (item.format || "IAM").toUpperCase();
                    const score = item.risk_score ?? 0;
                    
                    let scoreColor = "text-safe";
                    if (score >= 80) scoreColor = "text-danger";
                    else if (score >= 50) scoreColor = "text-orange-500";
                    else if (score >= 20) scoreColor = "text-yellow-500";

                    return (
                      <div 
                        key={item.session_id} 
                        onClick={() => handleHistoryClick(item.session_id)}
                        className="bg-[#141628] border border-[#1e2240] rounded-2xl p-5 hover:border-primary/40 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#0c0d1a] border border-[#1e2240] px-2 py-0.5 rounded text-[9px] font-bold text-slate-300">
                              {fmt}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              item.risk_label === "CRITICAL" || item.risk_label === "HIGH" 
                                ? "bg-danger/10 text-danger border-danger/20" 
                                : item.risk_label === "WARNING" || item.risk_label === "MEDIUM"
                                ? "bg-warning/10 text-warning border-warning/20"
                                : "bg-safe/10 text-safe border-safe/20"
                            }`}>
                              {item.risk_label || "LOW"} RISK
                            </span>
                          </div>
                          <div className="bg-[#0a0c16] rounded-lg p-2 font-mono text-[11px] text-muted truncate">
                            {item.policy_preview || "No policy content cached."}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-muted block uppercase tracking-wider">Risk Score</span>
                            <span className={`text-xl font-bold font-mono ${scoreColor}`}>{score}</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted hover:text-white transition-colors hidden md:block" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel */}
          <div className="w-80 border-l border-[#1e2240] bg-[#0a0c16]/50 flex flex-col h-full shrink-0 p-6 space-y-6 overflow-y-auto">
            
            {/* Credits Widget */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Credits Widget</span>
                <span className="text-[9px] text-muted">Resets in {timeLeft.hours}h {timeLeft.mins}m</span>
              </div>
              
              <div className="flex flex-col items-center py-4 relative">
                <div className="w-28 h-28 flex items-center justify-center relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="#1f2937" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="56" 
                      cy="56" 
                      r="48" 
                      stroke="#8b5cf6" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={(2 * Math.PI * 48) - (credits / totalDailyAllowance) * (2 * Math.PI * 48)}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-2xl font-bold text-white block font-mono">{credits}</span>
                    <span className="text-[9px] text-muted uppercase font-bold tracking-wider">Left Today</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <Link to="/pricing" className="text-xs font-bold text-primary hover:underline">
                  Get more credits →
                </Link>
              </div>
            </div>

            {/* Security Tip Card */}
            <div className="bg-[#141628] border-l-4 border-primary rounded-r-2xl p-5 space-y-4">
              <div className="flex items-center gap-1.5 text-primary">
                <Lightbulb className="w-4.5 h-4.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Security Tip</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {SECURITY_TIPS[tipIndex]}
              </p>
              <button 
                onClick={handleNextTip} 
                className="text-[10px] font-bold text-muted hover:text-slate-200 transition-colors"
              >
                Next tip →
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
