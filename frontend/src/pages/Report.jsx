import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, useVektraStore } from "../store/vektraStore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import ConflictCard from "../components/ConflictCard";
import { FileText, Printer, Clipboard, Check, Sparkles, Award, ExternalLink } from "lucide-react";

export default function ReportPage() {
  const navigate = useNavigate();
  const { stats, conflicts, format, sessionId, policyText, nodes, edges } = useVektraStore();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [sessionId]);

  const { risk_score, executive_summary, top_priorities, compliance_notes, risk_label } = stats;

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    const title = prompt(
      "Name this report:", 
      `Scan ${sessionId.slice(0, 8)}`
    );
    if (!title) return;

    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const fullAnalysisResult = {
      session_id: sessionId,
      policyText,
      format: format.toUpperCase(),
      nodes,
      edges,
      conflicts,
      stats,
    };

    try {
      const res = await fetch(`${API_BASE}/api/report/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          session_id: sessionId,
          report_data: fullAnalysisResult,
          title
        })
      });
      if (res.ok) {
        setSaved(true);
      } else {
        alert("Failed to save report: Server error");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save report: " + err.message);
    }
  };

  const handleCopyMarkdown = () => {
    let md = `# VEKTRA Cloud Policy Security Report\n`;
    md += `Generated: ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}\n`;
    md += `Risk Score: ${risk_score}/100 (${risk_label || "LOW"})\n\n`;
    
    md += `## Executive Summary\n`;
    md += `${executive_summary || "No executive summary available."}\n\n`;
    if (compliance_notes) {
      md += `## Compliance Notes\n${compliance_notes}\n\n`;
    }

    if (top_priorities && top_priorities.length > 0) {
      md += `## Top Priorities\n`;
      top_priorities.forEach((p, idx) => {
        md += `${idx + 1}. ${p}\n`;
      });
      md += `\n`;
    }

    md += `## Detected Vulnerabilities (${conflicts.length})\n\n`;
    
    conflicts.forEach((c, idx) => {
      md += `### Vulnerability ${idx + 1}: [${c.severity}] ${c.title}\n`;
      md += `- **Type**: ${c.type}\n`;
      md += `- **Affected Nodes**: ${c.affected_rules.join(", ")}\n`;
      if (c.exploitability_score) {
        md += `- **Exploitability**: ${c.exploitability_score}/10\n`;
      }
      if (c.danger_summary) {
        md += `- **Danger Summary**: ${c.danger_summary}\n`;
      }
      if (c.attack_scenario) {
        md += `- **Attack Scenario**: ${c.attack_scenario}\n`;
      }
      if (c.fixed_policy_block) {
        md += `- **Advisor Confidence**: ${c.confidence || "N/A"}\n`;
        md += `- **Fix Proposal**: ${c.fix_description}\n`;
        md += `\n\`\`\`${format === "iam" ? "json" : "yaml"}\n${c.fixed_policy_block}\n\`\`\`\n`;
      }
      md += `\n---\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let riskColorText = "text-primary";
  let riskBorder = "border-cardBorder";
  if (risk_score >= 70) {
    riskColorText = "text-danger";
    riskBorder = "border-danger/30";
  } else if (risk_score >= 30) {
    riskColorText = "text-warning";
    riskBorder = "border-warning/30";
  }

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans">
      
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        
        <div className="print:hidden">
          <TopBar />
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6 print:p-0 print:max-w-full">
          
          {/* Action Row - hidden in print */}
          <div className="flex justify-between items-center border-b border-cardBorder pb-4 print:hidden">
            <div>
              <h2 className="text-sm font-bold text-textMain uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Security Report Console
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Generate static summaries and markdown outputs for teams.
              </p>
            </div>
            
            <div className="flex gap-2.5">
              {saved ? (
                <button
                  disabled
                  className="px-3.5 py-2 rounded-[6px] bg-primary/10 border border-primary/20 text-primary text-xs transition-fast flex items-center gap-1.5 font-semibold cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>Saved</span>
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="px-3.5 py-2 rounded-[6px] border border-primary text-primary hover:bg-primary/5 text-xs transition-fast flex items-center gap-1.5 font-semibold"
                >
                  Save Report
                </button>
              )}
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-[6px] border border-cardBorder text-xs text-slate-200 hover:text-white hover:bg-cardSurface transition-fast flex items-center gap-1.5 font-semibold"
              >
                <Printer className="w-4 h-4 text-muted" />
                Export PDF
              </button>
              {sessionId && (
                <button
                  onClick={() => navigate(`/workflow/${sessionId}`)}
                  className="px-3.5 py-2 rounded-[6px] border border-cardBorder text-xs text-slate-200 hover:text-white hover:bg-cardSurface transition-fast flex items-center gap-1.5 font-semibold"
                >
                  <ExternalLink className="w-4 h-4 text-muted" />
                  Telemetry
                </button>
              )}
              <button
                onClick={handleCopyMarkdown}
                className="px-3.5 py-2 rounded-[6px] bg-primary hover:bg-primary/95 text-white text-xs transition-fast flex items-center gap-1.5 font-semibold border border-primary/20"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Printable Header */}
          <div className="hidden print:flex justify-between items-center border-b-2 border-slate-600 pb-4 mb-6">
            <span className="font-sans font-bold text-xl text-slate-800 uppercase tracking-widest">
              VEKTRA Cloud Security Report
            </span>
            <span className="text-xs text-slate-600 font-mono">
              Generated: {new Date().toLocaleDateString()}
            </span>
          </div>

          {/* Risk Score Hero Card (Redesigned matching Snyk guidelines) */}
          <div className={`border rounded-[6px] p-6 bg-cardSurface ${riskBorder} flex flex-col items-center justify-center text-center space-y-3`}>
            <div className="relative flex items-center justify-center">
              <div className={`text-6xl font-bold font-sans tracking-tight ${riskColorText}`}>
                {risk_score}
              </div>
              <div className="absolute -right-10 bottom-1 text-[10px] text-muted uppercase font-bold tracking-wider font-mono">
                / 100
              </div>
            </div>
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-textMain font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5">
                <Award className={`w-4.5 h-4.5 ${riskColorText}`} />
                Security Risk Assessment
              </h3>
              <p className="text-xs text-textMain leading-relaxed font-normal">
                "{executive_summary || "No active analysis data. Go back to upload policies."}"
              </p>
            </div>
          </div>

          {/* Conflict List */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider block border-b border-cardBorder pb-2 print:border-slate-400 print:text-slate-800">
              Detected Vulnerabilities ({conflicts.length})
            </h3>
            
            {conflicts.length === 0 ? (
              <div className="text-center py-10 bg-cardSurface rounded-[6px] border border-cardBorder">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-textMain uppercase tracking-wide">No vulnerabilities found</h4>
                <p className="text-xs text-muted max-w-xs mx-auto mt-1">
                  Upload a policy configuration containing vulnerabilities to inspect remediations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts.map((conflict, idx) => (
                  <ConflictCard 
                    key={conflict.id || idx} 
                    conflict={conflict} 
                    format={format} 
                  />
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
