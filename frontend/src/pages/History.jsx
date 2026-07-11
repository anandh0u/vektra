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

  const [formatFilter, setFormatFilter] = useState("all"); 
  const [severityFilter, setSeverityFilter] = useState("all"); 
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

  const filteredItems = items.filter((item) => {
    if (formatFilter !== "all" && (item.format || "").toLowerCase() !== formatFilter) {
      return false;
    }
    if (severityFilter !== "all") {
      const label = (item.risk_label || "").toLowerCase();
      if (severityFilter === "critical" && label !== "critical" && label !== "high") {
        return false;
      }
      if (severityFilter === "warning" && label !== "warning" && label !== "medium") {
        return false;
      }
    }
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
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            
            {/* Header row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-textMain flex items-center gap-2 tracking-tight uppercase">
                  <Clock className="h-5 w-5 text-primary" />
                  Scan Registry Logs
                </h1>
                <p className="mt-0.5 text-xs text-muted">
                  View and manage historical policy scans anchored to your Stellar operator key.
                </p>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                
                {/* Format Filter */}
                <div className="flex bg-pageBg p-1 rounded-[6px] border border-cardBorder text-xs font-semibold">
                  {["all", "iam", "k8s"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormatFilter(f)}
                      className={`px-3 py-1 rounded-[6px] uppercase transition-fast ${
                        formatFilter === f ? "bg-activeNav text-textMain border border-cardBorder" : "text-muted hover:text-textMain"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Severity Filter */}
                <div className="flex bg-pageBg p-1 rounded-[6px] border border-cardBorder text-xs font-semibold">
                  {["all", "critical", "warning"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={`px-3 py-1 rounded-[6px] uppercase transition-fast ${
                        severityFilter === s ? "bg-activeNav text-textMain border border-cardBorder" : "text-muted hover:text-textMain"
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
                  className="w-full bg-pageBg border border-cardBorder rounded-[6px] pl-10 pr-4 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-[6px] border border-cardBorder bg-cardSurface p-8 text-center text-xs text-muted font-mono uppercase tracking-wider">
                Loading scan logs...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[6px] border border-cardBorder bg-cardSurface p-16 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[6px] bg-primary/10 border border-primary/25 text-muted">
                  <Network className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xs font-bold text-textMain uppercase tracking-wide">No scan records</h2>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Upload permission configuration rules to view telemetry logs.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="h-10 bg-primary hover:bg-primary/95 text-white px-5 rounded-[6px] text-xs font-semibold transition-fast border border-primary/20"
                >
                  Start Scanning
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const format = (item.format || "scan").toUpperCase();
                  const riskLabel = (item.risk_label || "LOW").toUpperCase();
                  
                  let riskBadgeStyle = "bg-primary/10 text-primary border-primary/20";
                  if (riskLabel === "CRITICAL" || riskLabel === "HIGH") {
                    riskBadgeStyle = "bg-danger/10 text-danger border-danger/20";
                  } else if (riskLabel === "WARNING" || riskLabel === "MEDIUM") {
                    riskBadgeStyle = "bg-warning/10 text-warning border-warning/20";
                  }

                  const isRerunning = rerunningSessionId === item.session_id;

                  return (
                    <article key={item.session_id} className="rounded-[6px] border border-cardBorder bg-cardSurface p-5 space-y-4 transition-fast hover:border-muted/30">
                      
                      {/* Top Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-[6px] bg-pageBg border border-cardBorder px-2.5 py-0.5 text-[8px] font-bold text-slate-300 font-mono">
                            {format}
                          </span>
                          <span className={`rounded-[6px] border px-2.5 py-0.5 text-[8px] font-bold ${riskBadgeStyle}`}>
                            {riskLabel} RISK
                          </span>
                        </div>
                        <span className="text-[10px] text-muted font-mono">
                          {formatScanDate(item.scanned_at)}
                        </span>
                      </div>

                      {/* Middle Row */}
                      <div className="bg-pageBg rounded-[6px] p-3.5 border border-cardBorder">
                        <code className="text-slate-300 font-mono text-[11px] leading-relaxed line-clamp-2 block">
                          {item.policy_preview || "No preview stored."}
                        </code>
                      </div>

                      {/* Stats Row */}
                      <div className="flex flex-wrap gap-2 text-[9px] font-bold font-mono uppercase">
                        <span className="bg-[#FF5C4D]/10 border border-[#FF5C4D]/25 text-[#FF5C4D] px-2.5 py-1 rounded-[6px]">
                          {item.critical_count || 0} Critical
                        </span>
                        <span className="bg-[#F2A94B]/10 border border-[#F2A94B]/25 text-[#F2A94B] px-2.5 py-1 rounded-[6px]">
                          {item.warning_count || 0} Warning
                        </span>
                        <span className="bg-[#4C8DFF]/10 border border-[#4C8DFF]/25 text-[#4C8DFF] px-2.5 py-1 rounded-[6px]">
                          {item.info_count || 0} Info
                        </span>
                        <span className="bg-primary/10 border border-primary/25 text-primary px-2.5 py-1 rounded-[6px]">
                          Risk Index: {item.risk_score || 0}
                        </span>
                      </div>

                      {/* Bottom Row */}
                      <div className="flex items-center justify-between border-t border-cardBorder pt-4 text-xs">
                        <span className="font-mono text-[10px] text-muted bg-pageBg px-2 py-0.5 rounded-[6px] border border-cardBorder">
                          run_id: {item.session_id ? item.session_id.slice(0, 16) : "session"}...
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRerun(item)}
                            disabled={isRerunning}
                            className="bg-pageBg hover:bg-activeNav text-muted hover:text-textMain border border-cardBorder disabled:opacity-40 px-3 py-1.5 rounded-[6px] font-semibold transition-fast flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            {isRerunning ? "Rerunning..." : "Rerun (2 CRED)"}
                          </button>
                          <button
                            onClick={() => openReport(item.session_id)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-[6px] font-semibold transition-fast flex items-center gap-1"
                          >
                            View Report
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
