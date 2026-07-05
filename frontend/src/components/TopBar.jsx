import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronRight, Sparkles, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthNav from "./AuthNav";
import { useVektraStore } from "../store/vektraStore";

export default function TopBar() {
  const navigate = useNavigate();
  const { recentAnalyses, loadRecentAnalysis } = useVektraStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAnalyses = recentAnalyses.filter((session) => {
    const term = searchTerm.toLowerCase();
    const formatMatch = (session.format || "").toLowerCase().includes(term);
    const summaryMatch = (session.stats?.executive_summary || "").toLowerCase().includes(term);
    const previewMatch = (session.policyText || "").toLowerCase().includes(term);
    return formatMatch || summaryMatch || previewMatch;
  });

  const handleSelectSession = (session) => {
    loadRecentAnalysis(session);
    setShowDropdown(false);
    navigate("/analyze");
  };

  return (
    <header className="h-16 border-b border-[#1e2240] bg-[#0d0f1a] flex items-center justify-between px-8 select-none relative z-50">
      {/* Search Input & Dropdown */}
      <div className="relative w-96" ref={dropdownRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search recent scans & sessions..."
          className="w-full bg-[#141628] border border-[#1e2240] rounded-lg py-1.5 pl-10 pr-4 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
        />
        {searchTerm === "" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-[#1e2240] text-muted px-1.5 py-0.5 rounded border border-cardBorder">
            ⌘K
          </div>
        )}

        {/* Sessions Dropdown */}
        {showDropdown && (
          <div className="absolute left-0 mt-2 w-full rounded-xl border border-[#1e2240] bg-[#0a0c16] p-2 shadow-2xl space-y-1.5 max-h-72 overflow-y-auto">
            <span className="px-3 py-1 text-[9px] font-bold text-muted uppercase tracking-wider block">
              Recent Scan Sessions
            </span>
            {filteredAnalyses.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted">
                No recent sessions found.
              </div>
            ) : (
              filteredAnalyses.map((session, idx) => {
                const format = (session.format || "").toUpperCase();
                const riskLabel = (session.stats?.risk_label || "LOW").toUpperCase();
                const score = session.stats?.risk_score ?? 0;
                
                let riskBadgeStyle = "bg-safe/10 text-safe border-safe/20";
                if (riskLabel === "CRITICAL" || riskLabel === "HIGH") {
                  riskBadgeStyle = "bg-danger/10 text-danger border-danger/20";
                } else if (riskLabel === "WARNING" || riskLabel === "MEDIUM") {
                  riskBadgeStyle = "bg-warning/10 text-warning border-warning/20";
                }

                return (
                  <button
                    key={session.session_id || idx}
                    onClick={() => handleSelectSession(session)}
                    className="w-full text-left p-2.5 rounded-lg bg-[#141628]/40 border border-[#1e2240]/40 hover:bg-[#141628] hover:border-[#1e2240] transition-all duration-200 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#1e2240] text-slate-300">
                          {format}
                        </span>
                        <span className="text-[9px] text-muted truncate block">
                          {session.timestamp || "Recent scan"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 truncate font-mono">
                        {session.policyText?.slice(0, 50) || "No preview content"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${riskBadgeStyle}`}>
                        {riskLabel} ({score}%)
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <AuthNav />
    </header>
  );
}
