import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Network, AlertTriangle, ShieldAlert, Sparkles, Search } from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { getAuthHeaders, useVektraStore } from "../store/vektraStore";
import toast from "react-hot-toast";

function formatScanDate(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recently";
  
  // Format options: July 3, 2026 · 11:42 PM
  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
  
  return `${formatted} · ${time}`;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { loadRecentAnalysis, rerunAnalysis, refreshCurrentUser, currentUser } = useVektraStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rerunningSessionId, setRerunningSessionId] = useState(null);

  // Filters
  const [formatFilter, setFormatFilter] = useState("all"); // "all" | "iam" | "k8s"
  const [severityFilter, setSeverityFilter] = useState("all"); // "all" | "critical" | "warning"
  const [searchQuery, setSearchQuery] = useState("");

  const fetchHistory = () => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    setLoading(true);
    fetch(`${API_BASE}/api/history`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load scan history.");
        return res.json();
      })
      .then((data) => setItems(data.history || []))
      .catch((err) => toast.error(err.message || "Failed to load history"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const openReport = async (sessionId) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const loadingToast = toast.loading("Loading report...");
    try {
      const res = await fetch(`${API_BASE}/api/report/${sessionId}`, { headers: getAuthHeaders() });
      toast.dismiss(loadingToast);
      if (!res.ok) {
        toast.error("Saved report not found.");
        return;
      }
      const data = await res.json();
      if (data?.report_json) {
        loadRecentAnalysis(data.report_json);
        navigate("/report");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleRerun = async (item) => {
    const userCredits = currentUser?.credits_balance ?? 0;
    if (userCredits < 2) {
      toast.error("Insufficient credits. Rerun cost: 2 CRED.");
      return;
    }
    
    setRerunningSessionId(item.session_id);
    const rerunToast = toast.loading("Re-running AI agents (2 credits)...");
    
    try {
      // We need to fetch the policy text of the scan first.
      // Usually the saved report contains the full policy_json which has format, nodes, and policyText.
      // Let's get it from report.
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/report/${item.session_id}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error("Could not retrieve original policy text for rerun.");
      }
      const data = await res.json();
      const reportContent = data.report_json;
      if (!reportContent || !reportContent.policyText) {
        throw new Error("Original policy text not found in stored report.");
      }
      
      await rerunAnalysis(item.session_id, reportContent.policyText, item.format || "iam");
      toast.dismiss(rerunToast);
      toast.success("Analysis complete — agents executed successfully.");
      
      // Update state and refresh history
      await refreshCurrentUser();
      fetchHistory();
      navigate("/analyze");
    } catch (err) {
      toast.dismiss(rerunToast);
      toast.error(err.message || "Rerun failed.");
    } finally {
      setRerunningSessionId(null);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    // 1. Format Filter
    if (formatFilter !== "all" && (item.format || "").toLowerCase() !== formatFilter) {
      return false;
    }
    // 2. Severity Filter
    if (severityFilter !== "all") {
      const label = (item.risk_label || "").toLowerCase();
      if (severityFilter === "critical" && label !== "critical" && label !== "high") {
        return false;
      }
      if (severityFilter === "warning" && label !== "warning" && label !== "medium") {
        return false;
      }
    }
    // 3. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const preview = (item.policy_preview || "").toLowerCase();
      const summary = (item.executive_summary || "").toLowerCase();
      const sid = (item.session_id || "").toLowerCase();
      if (!preview.includes(query) && !summary.includes(query) && !sid.includes(query)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            
            {/* Header row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
                  <Clock className="h-6 w-6 text-primary" />
                  Scan History
                </h1>
                <p className="mt-1 text-xs text-muted">
                  View and manage Neo4j relationship scan logs linked to your operator account.
                </p>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                
                {/* Format Filter */}
                <div className="flex bg-[#0d0f1a] p-1 rounded-xl border border-[#1e2240] text-xs font-semibold">
                  {["all", "iam", "k8s"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormatFilter(f)}
                      className={`px-3 py-1.5 rounded-lg uppercase transition-all duration-200 ${
                        formatFilter === f ? "bg-primary text-white" : "text-muted hover:text-slate-200"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Severity Filter */}
                <div className="flex bg-[#0d0f1a] p-1 rounded-xl border border-[#1e2240] text-xs font-semibold">
                  {["all", "critical", "warning"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={`px-3 py-1.5 rounded-lg uppercase transition-all duration-200 ${
                        severityFilter === s ? "bg-primary text-white" : "text-muted hover:text-slate-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

              </div>

              {/* Search input */}
              <div className="relative w-full md:w-80 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search policies..."
                  className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-[#1e2240] bg-[#141628] p-8 text-center text-xs text-muted">
                Loading scan logs...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-[#1e2240] bg-[#141628] p-16 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-muted">
                  <Network className="w-8 h-8 opacity-40 text-primary" />
                </div>
                <h2 className="font-heading text-lg font-bold text-slate-300">No scans yet</h2>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Upload your first policy to get started mapping entity relationships.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="bg-primary hover:bg-primary/80 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                >
                  Start scanning →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const format = (item.format || "scan").toUpperCase();
                  const riskLabel = (item.risk_label || "LOW").toUpperCase();
                  
                  let riskBadgeStyle = "bg-safe/10 text-safe border-safe/20";
                  if (riskLabel === "CRITICAL" || riskLabel === "HIGH") {
                    riskBadgeStyle = "bg-danger/10 text-danger border-danger/20";
                  } else if (riskLabel === "WARNING" || riskLabel === "MEDIUM") {
                    riskBadgeStyle = "bg-warning/10 text-warning border-warning/20";
                  }

                  const isRerunning = rerunningSessionId === item.session_id;

                  return (
                    <article key={item.session_id} className="rounded-2xl border border-[#1e2240] bg-[#141628] p-5 space-y-4 transition-all hover:border-[#2b305e]">
                      
                      {/* Top Row: Badges and Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-[#0d0f1a] border border-[#1e2240] px-2.5 py-0.5 text-[9px] font-bold text-slate-300">
                            {format}
                          </span>
                          <span className={`rounded border px-2.5 py-0.5 text-[9px] font-bold ${riskBadgeStyle}`}>
                            {riskLabel} RISK
                          </span>
                        </div>
                        <span className="text-[10px] text-muted font-medium">
                          {formatScanDate(item.scanned_at)}
                        </span>
                      </div>

                      {/* Middle Row: Code Box */}
                      <div className="bg-[#0a0c16] rounded-xl p-3 border border-[#1e2240]/40">
                        <code className="text-slate-300 font-mono text-xs leading-relaxed line-clamp-2 block">
                          {item.policy_preview || "No preview stored."}
                        </code>
                      </div>

                      {/* Stats Row */}
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                        <span className="bg-danger/10 border border-danger/20 text-danger px-2.5 py-1 rounded-lg">
                          🔴 {item.critical_count || 0} Critical
                        </span>
                        <span className="bg-warning/10 border border-warning/20 text-warning px-2.5 py-1 rounded-lg">
                          🟡 {item.warning_count || 0} Warning
                        </span>
                        <span className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] px-2.5 py-1 rounded-lg">
                          🔵 {item.info_count || 0} Info
                        </span>
                        <span className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-lg">
                          📊 Risk: {item.risk_score || 0}
                        </span>
                      </div>

                      {/* Bottom Row */}
                      <div className="flex items-center justify-between border-t border-[#1e2240]/40 pt-4 text-xs">
                        <span className="font-mono text-[10px] text-muted bg-[#0d0f1a] px-2 py-1 rounded border border-[#1e2240]/40">
                          {item.session_id ? item.session_id.slice(0, 18) : "session-id"}...
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRerun(item)}
                            disabled={isRerunning}
                            className="bg-[#0d0f1a] hover:bg-[#1e2240] text-muted hover:text-slate-200 border border-[#1e2240] disabled:opacity-50 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            {isRerunning ? "Re-running..." : "Re-run Agents (2 CRED)"}
                          </button>
                          <button
                            onClick={() => openReport(item.session_id)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1"
                          >
                            View Report →
                          </button>
                        </div>
                      </div>

                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
