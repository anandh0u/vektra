import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronRight, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthNav from "./AuthNav";
import { useVektraStore } from "../store/vektraStore";

export default function TopBar() {
  const navigate = useNavigate();
  const { recentAnalyses, loadRecentAnalysis, theme, setTheme } = useVektraStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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
    <header className="h-16 border-b border-cardBorder bg-pageBg flex items-center justify-between px-8 select-none relative z-50">
      
      {/* Search Input & Dropdown */}
      <div className="relative w-96" ref={dropdownRef}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search policy scans & sessions..."
          className="w-full bg-cardSurface border border-cardBorder rounded-lg py-2 pl-10 pr-4 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
        />
        {searchTerm === "" && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] bg-cardSurface text-muted px-1.5 py-0.5 rounded border border-cardBorder font-mono">
            ⌘K
          </div>
        )}

        {/* Sessions Dropdown */}
        {showDropdown && (
          <div className="absolute left-0 mt-2 w-full rounded-lg border border-cardBorder bg-cardSurface p-1.5 shadow-xl space-y-1 max-h-72 overflow-y-auto z-50">
            <span className="px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider block">
              Recent scan sessions
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
                
                let riskBadgeStyle = "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20";
                if (riskLabel === "CRITICAL" || riskLabel === "HIGH") {
                  riskBadgeStyle = "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20";
                } else if (riskLabel === "WARNING" || riskLabel === "MEDIUM") {
                  riskBadgeStyle = "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20";
                }

                return (
                  <button
                    key={session.session_id || idx}
                    onClick={() => handleSelectSession(session)}
                    className="w-full text-left p-2.5 rounded-md bg-cardSurface hover:bg-bgElevated transition-fast flex items-center justify-between gap-3 border border-transparent hover:border-cardBorder"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-cardSurface text-slate-300 text-[8px] font-bold tracking-wider font-mono">
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
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${riskBadgeStyle}`}>
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

      <div className="flex items-center gap-4">
        {/* Quick Theme Switch */}
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2 rounded-[6px] border border-cardBorder bg-cardSurface/50 text-muted hover:text-textMain transition-fast flex items-center justify-center"
          title="Toggle Light/Dark Theme"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4 text-primary" />
          ) : (
            <Sun className="w-4 h-4 text-primary" />
          )}
        </button>
        <AuthNav />
      </div>
    </header>
  );
}
