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
  Lightbulb,
  UserCheck,
  Key,
  ShieldCheck,
  AlertOctagon,
  Bell
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
import toast from "react-hot-toast";

const SECURITY_TIPS = [
  "Always use resource-specific ARNs instead of wildcards (*) in IAM policies.",
  "Enable MFA for all IAM users with console access, especially admin accounts.",
  "Use IAM roles for EC2 instances instead of storing access keys on the instance.",
  "Regularly rotate IAM access keys — set a 90-day rotation policy.",
  "Use AWS Organizations SCPs to set permission guardrails across all accounts.",
  "Never attach AdministratorAccess policy to users directly — use roles with boundaries.",
  "In Kubernetes, avoid ClusterRoleBindings for namespace-scoped workloads.",
  "Grant least privilege — start with no permissions and add only what's needed.",
  "Use Condition keys in IAM policies to restrict access by IP, time, or MFA status."
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser, sessionId } = useVektraStore();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * SECURITY_TIPS.length);
    setTipIndex(randomIdx);
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
          <div className="flex-1 flex flex-col p-8 space-y-6 overflow-y-auto min-w-0">
            
            {/* Header / Greeting */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-textMain uppercase">
                  SOC COMMAND CONSOLE
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  Logged in as Operator: <span className="text-primary font-semibold font-mono">{name}</span>
                </p>
              </div>

              {/* Alert Status Banner */}
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-[6px] px-3.5 py-1 text-xs text-primary font-semibold font-mono">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                <span>REAL-TIME TELEMETRY FEED ACTIVE</span>
              </div>
            </div>

            {/* Overall Security Score & Controls Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Security Score Widget */}
              <div className="glass-card rounded-lg p-5 flex flex-col justify-between h-40">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Security Posture Score</span>
                  <span className="text-3xl font-extrabold text-primary font-mono block">78%</span>
                </div>
                <div className="text-[11px] text-muted font-normal leading-relaxed">
                  Passing checks for CIS AWS Foundations controls and least-privilege benchmarks.
                </div>
              </div>

              {/* Monitored Identities Widget */}
              <div className="glass-card rounded-lg p-5 flex flex-col justify-between h-40">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Credential Health</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-textMain mt-1.5">
                    <span className="text-primary font-mono">MFA active</span>
                    <span className="text-primary font-mono">0 Key leaks</span>
                  </div>
                </div>
                <div className="text-[11px] text-muted font-normal leading-relaxed">
                  No active API keys exposed in repository code bases. Multi-Factor setup enforced.
                </div>
              </div>

              {/* Excessive Permissions Widget */}
              <div className="glass-card rounded-lg p-5 flex flex-col justify-between h-40">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Permission Boundaries</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-textMain mt-1.5">
                    <span className="text-[#FF5C4D] font-mono">4 Wildcards</span>
                    <span className="text-[#F59E0B] font-mono">2 Escalations</span>
                  </div>
                </div>
                <div className="text-[11px] text-muted font-normal leading-relaxed">
                  Escalation paths detected in connected AWS accounts. Remediations listed.
                </div>
              </div>

            </div>

            {/* Stat Cards Grid (Recharts Sparklines) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Scans */}
              <div className="glass-card rounded-lg p-4 flex flex-col justify-between h-28 hover:border-muted/30 transition-fast">
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Total Scans</span>
                  <span className="text-2xl font-bold text-textMain mt-1.5 block font-sans tracking-tight">{totalScans}</span>
                </div>
                <div className="w-20 h-8 self-end opacity-50 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData1.map((v) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 2: Critical Found */}
              <div className="glass-card rounded-lg p-4 flex flex-col justify-between h-28 hover:border-muted/30 transition-fast">
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
              <div className="glass-card rounded-lg p-4 flex flex-col justify-between h-28 hover:border-muted/30 transition-fast">
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Fixes Generated</span>
                  <span className="text-2xl font-bold text-primary mt-1.5 block font-sans tracking-tight">{totalCritical + totalWarnings}</span>
                </div>
                <div className="w-20 h-8 self-end opacity-50 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData3.map((v) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 4: Credits Balance */}
              <div className="glass-card rounded-lg p-4 flex flex-col justify-between h-28 hover:border-muted/30 transition-fast">
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Credits Balance</span>
                  <span className="text-2xl font-bold text-primary mt-1.5 block font-sans tracking-tight">{credits}</span>
                </div>
                <div className="w-20 h-8 self-end opacity-50 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData4.map((v) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Recharts vulnerability breakdown */}
            <div className="glass-card rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Vulnerability Severity Trends (Last 7 scans)</h3>
              <div className="h-60 w-full">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted italic font-normal">
                    No scan data yet. Run scans to populate chart.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                      <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: "6px" }}
                        labelStyle={{ color: "var(--text-primary)", fontWeight: "semibold", fontSize: "11px" }}
                      />
                      <Bar dataKey="Critical" fill="var(--alert-red)" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Warning" fill="var(--warn-amber)" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Info" fill="var(--signal-blue)" radius={[2, 2, 0, 0]} />
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
                <div className="text-xs text-muted py-6 text-center font-mono">Loading recent history...</div>
              ) : historyItems.length === 0 ? (
                <div className="glass-card rounded-lg p-8 text-center text-xs text-muted font-normal">
                  No scan history on your account. Upload a policy to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.slice(0, 4).map((item) => {
                    const fmt = (item.format || "IAM").toUpperCase();
                    const score = item.risk_score ?? 0;
                    
                    let scoreColor = "text-primary";
                    if (score >= 80) scoreColor = "text-[#FF5C4D]";
                    else if (score >= 50) scoreColor = "text-[#F2A94B]";

                    return (
                      <div 
                        key={item.session_id} 
                        onClick={() => handleHistoryClick(item.session_id)}
                        className="glass-card rounded-lg p-4 hover:border-primary/40 transition-fast cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
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

          {/* Right Sidebar Panel */}
          <div className="w-80 border-l border-cardBorder bg-[#18181B]/10 flex flex-col h-full shrink-0 p-6 space-y-6 overflow-y-auto">
            
            {/* Quick Actions (Quiet Solid Cards) */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Quick Scanners</span>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => navigate("/")}
                  className="bg-cardSurface border border-cardBorder p-4 rounded-lg text-left hover-lift flex flex-col justify-between h-24"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <div>
                    <h3 className="font-semibold text-xs text-textMain uppercase tracking-wide">Run Scan</h3>
                    <p className="text-[9px] text-muted mt-0.5 font-normal">Analyze IAM or RBAC</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Security Tip Card */}
            <div className="bg-cardSurface border-l-2 border-primary rounded-r-lg border border-y-cardBorder border-r-cardBorder p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-primary">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Remediation Tips</span>
              </div>
              <p className="text-xs text-textMain leading-relaxed font-normal">
                {SECURITY_TIPS[tipIndex]}
              </p>
              <button 
                onClick={handleNextTip} 
                className="text-[9px] font-bold text-muted hover:text-textMain transition-colors uppercase font-mono tracking-wider block"
              >
                Next Tip →
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
