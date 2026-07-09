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

  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * SECURITY_TIPS.length);
    setTipIndex(randomIdx);
  }, []);

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

  const totalScans = historyItems.length;
  const totalCritical = historyItems.reduce((acc, curr) => acc + (curr.critical_count || 0), 0);
  const totalWarnings = historyItems.reduce((acc, curr) => acc + (curr.warning_count || 0), 0);
  const totalInfo = historyItems.reduce((acc, curr) => acc + (curr.info_count || 0), 0);
  const totalFixes = totalCritical + totalWarnings; 
  
  const getHoursToMidnightIST = () => {
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

  const chartData = historyItems.slice(0, 7).reverse().map((item, index) => ({
    name: `Scan ${totalScans - 6 + index > 0 ? totalScans - 6 + index : index + 1}`,
    Critical: item.critical_count || 0,
    Warning: item.warning_count || 0,
    Info: item.info_count || 0,
  }));

  const last7Scans = [...historyItems].slice(0, 7).reverse();
  const sparklineData1 = last7Scans.length >= 2 ? last7Scans.map((x, i) => i + 1) : [1, 2, 3, 4, 5];
  const sparklineData2 = last7Scans.length >= 2 ? last7Scans.map(x => x.critical_count || 0) : [0, 0, 0, 0, 0];
  const sparklineData3 = last7Scans.length >= 2 ? last7Scans.map(x => (x.critical_count || 0) + (x.warning_count || 0)) : [0, 0, 0, 0, 0];
  const sparklineData4 = last7Scans.length >= 2 ? last7Scans.map(x => x.risk_score || 0) : [0, 0, 0, 0, 0];

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
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 flex min-w-0">
          
          {/* Main Area */}
          <div className="flex-1 flex flex-col p-8 space-y-8 overflow-y-auto min-w-0">
            
            {/* Header / Greeting */}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-textMain">
                Operator Workspace · {name}
              </h1>
              <p className="text-xs text-muted mt-0.5">
                Active Tier: <span className="text-primary font-semibold uppercase font-mono">{tier}</span> · Available quota: <span className="text-primary font-semibold font-mono">{credits} tokens</span>
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Scans */}
              <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 flex flex-col justify-between h-28 hover:border-muted/30 transition-fast">
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Total Scans</span>
                  <span className="text-2xl font-bold text-textMain mt-1.5 block font-sans tracking-tight">{totalScans}</span>
                </div>
                <div className="w-20 h-8 self-end opacity-50 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData1.map((v) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#4C8DFF" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 2: Critical Found */}
              <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 flex flex-col justify-between h-28 hover:border-muted/30 transition-fast">
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Critical Found</span>
                  <span className="text-2xl font-bold text-[#FF5C4D] mt-1.5 block font-sans tracking-tight">{totalCritical}</span>
                </div>
                <div className="w-20 h-8 self-end opacity-50 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData2.map((v) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#FF5C4D" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 3: Fixes Generated */}
              <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 flex flex-col justify-between h-28 hover:border-muted/30 transition-fast">
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Fixes Generated</span>
                  <span className="text-2xl font-bold text-primary mt-1.5 block font-sans tracking-tight">{totalFixes}</span>
                </div>
                <div className="w-20 h-8 self-end opacity-50 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData3.map((v) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#4C8DFF" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 4: Credits Used */}
              <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 flex flex-col justify-between h-28 hover:border-muted/30 transition-fast">
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Credits Balance</span>
                  <span className="text-2xl font-bold text-primary mt-1.5 block font-sans tracking-tight">{credits}</span>
                </div>
                <div className="w-20 h-8 self-end opacity-50 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData4.map((v) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#4C8DFF" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Quick Actions (Quiet Solid Cards) */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <button
                  onClick={() => navigate("/")}
                  className="bg-cardSurface border border-cardBorder p-4 rounded-[6px] text-left hover-lift flex flex-col justify-between h-28"
                >
                  <Plus className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-xs text-textMain uppercase tracking-wide">Run New Scan</h3>
                    <p className="text-[10px] text-muted mt-0.5 font-normal">Upload or paste IAM policy rules</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/history")}
                  className="bg-cardSurface border border-cardBorder p-4 rounded-[6px] text-left hover-lift flex flex-col justify-between h-28"
                >
                  <History className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-xs text-textMain uppercase tracking-wide">View History</h3>
                    <p className="text-[10px] text-muted mt-0.5 font-normal">Audit previous execution payloads</p>
                  </div>
                </button>

                {isFree ? (
                  <button
                    onClick={() => navigate("/pricing")}
                    className="bg-cardSurface border border-[#F2A94B]/35 p-4 rounded-[6px] text-left hover-lift flex flex-col justify-between h-28"
                  >
                    <Sparkles className="w-5 h-5 text-[#F2A94B] animate-pulse" />
                    <div>
                      <h3 className="font-semibold text-xs text-[#F2A94B] uppercase tracking-wide">Upgrade Plan</h3>
                      <p className="text-[10px] text-muted mt-0.5 font-normal">Unlock unlimited daily scans</p>
                    </div>
                  </button>
                ) : (
                  <div className="bg-cardSurface border border-cardBorder p-4 rounded-[6px] text-left flex flex-col justify-between h-28">
                    <Coins className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-xs text-textMain uppercase tracking-wide">Wallet Balance</h3>
                      <p className="text-[10px] text-muted mt-0.5 font-normal">Stellar anchored credits account</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Recharts vulnerability breakdown */}
            <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-5 space-y-4">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Vulnerability Severity Trends (Last 7 scans)</h3>
              <div className="h-60 w-full">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted italic">
                    No scan data yet. Run scans to populate chart.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#8A93A6" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                      <YAxis stroke="#8A93A6" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#12161F", border: "1px solid #232838", borderRadius: "6px" }}
                        labelStyle={{ color: "#E8EAED", fontWeight: "semibold", fontSize: "11px" }}
                      />
                      <Bar dataKey="Critical" fill="#FF5C4D" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Warning" fill="#F2A94B" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Info" fill="#4C8DFF" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Scans */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Recent Scans</h2>
                <Link to="/history" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  View history <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="text-xs text-muted py-6 text-center">Loading recent history...</div>
              ) : historyItems.length === 0 ? (
                <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-8 text-center text-xs text-muted">
                  No scan history on your account. Upload a policy to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.slice(0, 5).map((item) => {
                    const fmt = (item.format || "IAM").toUpperCase();
                    const score = item.risk_score ?? 0;
                    
                    let scoreColor = "text-primary";
                    if (score >= 80) scoreColor = "text-[#FF5C4D]";
                    else if (score >= 50) scoreColor = "text-[#F2A94B]";

                    return (
                      <div 
                        key={item.session_id} 
                        onClick={() => handleHistoryClick(item.session_id)}
                        className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 hover:border-primary/40 transition-fast cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="bg-pageBg border border-cardBorder px-2 py-0.5 rounded-[6px] text-[8px] font-bold text-slate-300 font-mono">
                              {fmt}
                            </span>
                            <span className={`px-2 py-0.5 rounded-[6px] text-[8px] font-bold border ${
                              item.risk_label === "CRITICAL" || item.risk_label === "HIGH" 
                                ? "bg-[#FF5C4D]/10 text-[#FF5C4D] border-[#FF5C4D]/20" 
                                : item.risk_label === "WARNING" || item.risk_label === "MEDIUM"
                                ? "bg-[#F2A94B]/10 text-[#F2A94B] border-[#F2A94B]/20"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}>
                              {item.risk_label || "LOW"} RISK
                            </span>
                          </div>
                          <div className="bg-pageBg border border-cardBorder rounded-[6px] p-2.5 font-mono text-[10px] text-muted truncate">
                            {item.policy_preview || "No policy content cached."}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-muted block uppercase tracking-wider">Risk Score</span>
                            <span className={`text-lg font-bold font-mono ${scoreColor}`}>{score}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted hover:text-white transition-colors hidden md:block" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel */}
          <div className="w-80 border-l border-cardBorder bg-[#12161F]/50 flex flex-col h-full shrink-0 p-6 space-y-6 overflow-y-auto">
            
            {/* Credits Widget */}
            <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Quota Registry</span>
                <span className="text-[9px] text-muted font-mono">{timeLeft.hours}h {timeLeft.mins}m</span>
              </div>
              
              <div className="flex flex-col items-center py-2 relative">
                <div className="w-24 h-24 flex items-center justify-center relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#232838" strokeWidth="4" fill="transparent" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      stroke="#4C8DFF" 
                      strokeWidth="4" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={(2 * Math.PI * 40) - (credits / totalDailyAllowance) * (2 * Math.PI * 40)}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-bold text-textMain block font-mono">{credits}</span>
                    <span className="text-[8px] text-muted uppercase font-bold tracking-wider">Left</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-1.5 border-t border-cardBorder">
                <Link to="/pricing" className="text-xs font-bold text-primary hover:underline">
                  Get more credits →
                </Link>
              </div>
            </div>

            {/* Security Tip Card */}
            <div className="bg-cardSurface border-l-2 border-primary rounded-r-[6px] border border-y-cardBorder border-r-cardBorder p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-primary">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Security Guideline</span>
              </div>
              <p className="text-xs text-textMain leading-relaxed font-normal">
                {SECURITY_TIPS[tipIndex]}
              </p>
              <button 
                onClick={handleNextTip} 
                className="text-[9px] font-bold text-muted hover:text-textMain transition-colors uppercase font-mono tracking-wider block"
              >
                Next guideline →
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
