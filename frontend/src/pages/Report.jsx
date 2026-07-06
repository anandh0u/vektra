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

  // Color logic for risk
  let riskColorText = "text-safe";
  let riskBgGradient = "from-safe/20 to-transparent border-safe/30";
  if (risk_score >= 70) {
    riskColorText = "text-danger";
    riskBgGradient = "from-danger/20 to-transparent border-danger/30";
  } else if (risk_score >= 30) {
    riskColorText = "text-warning";
    riskBgGradient = "from-warning/20 to-transparent border-warning/30";
  }

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar - hidden in print */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* Main View */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TopBar - hidden in print */}
        <div className="print:hidden">
          <TopBar />
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6 print:p-0 print:max-w-full">
          
          {/* Action Row - hidden in print */}
          <div className="flex justify-between items-center border-b border-[#1e2240] pb-4 print:hidden">
            <div>
              <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Security Report
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Generate static summaries and markdown outputs for teams.
              </p>
            </div>
            
            <div className="flex gap-2">
              {saved ? (
                <button
                  disabled
                  className="px-4 py-2 rounded-lg bg-safe text-white text-xs transition-all flex items-center gap-2 font-medium cursor-not-allowed opacity-90"
                >
                  <Check className="w-4.5 h-4.5" />
                  <span>✓ Saved</span>
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 text-xs transition-all flex items-center gap-2 font-medium"
                >
                  Save Report
                </button>
              )}
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-lg border border-[#1e2240] text-xs text-slate-200 hover:text-white hover:bg-[#141628] transition-all flex items-center gap-2 font-medium"
              >
                <Printer className="w-4 h-4 text-muted" />
                Export PDF
              </button>
              {sessionId && (
                <button
                  onClick={() => navigate(`/workflow/${sessionId}`)}
                  className="px-4 py-2 rounded-lg border border-[#1e2240] text-xs text-slate-200 hover:text-white hover:bg-[#141628] transition-all flex items-center gap-2 font-medium"
                >
                  <ExternalLink className="w-4 h-4 text-muted" />
                  View Workflow Execution
                </button>
              )}
              <button
                onClick={handleCopyMarkdown}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-xs transition-all flex items-center gap-2 font-medium"
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
            <span className="font-heading font-bold text-2xl text-slate-800 uppercase tracking-widest">
              VEKTRA Cloud Security Report
            </span>
            <span className="text-xs text-slate-600">
              Generated: {new Date().toLocaleDateString()}
            </span>
          </div>

          {/* Risk Score Hero Card */}
          <div className={`border rounded-2xl p-8 bg-gradient-to-b ${riskBgGradient} flex flex-col items-center justify-center text-center space-y-4`}>
            <div className="relative flex items-center justify-center">
              <div className={`text-7xl font-bold font-heading ${riskColorText}`}>
                {risk_score}
              </div>
              <div className="absolute -right-12 bottom-1.5 text-xs text-muted uppercase font-bold tracking-wider">
                / 100
              </div>
            </div>
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-slate-100 font-heading font-semibold text-base flex items-center justify-center gap-2">
                <Award className={`w-5 h-5 ${riskColorText}`} />
                Security Risk Assessment
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{executive_summary || "No active analysis data. Go back to upload policies."}"
              </p>
            </div>
          </div>

          {/* Conflict List */}
          <div className="space-y-6">
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2 border-b border-[#1e2240] pb-2 print:border-slate-400 print:text-slate-800">
              Detected Vulnerabilities ({conflicts.length})
            </h3>
            
            {conflicts.length === 0 ? (
              <div className="text-center py-10 bg-cardSurface rounded-xl border border-cardBorder">
                <Sparkles className="w-8 h-8 text-safe mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-300">No vulnerabilities found</h4>
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
