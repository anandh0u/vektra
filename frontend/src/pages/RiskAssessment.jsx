import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { AlertCircle, Shield, AlertTriangle, Info, Zap, ShieldAlert } from "lucide-react";

const RISK_FINDINGS = [
  {
    id: "risk-1",
    title: "Privilege Escalation via iam:CreatePolicyVersion",
    severity: "CRITICAL",
    category: "Privilege Escalation",
    impact: 5,
    likelihood: 5,
    description: "Allows an actor to create a new version of an IAM policy they own, potentially granting themselves AdministratorAccess by defining wildcard permissions."
  },
  {
    id: "risk-2",
    title: "Unused administrator keys active for >90 days",
    severity: "CRITICAL",
    category: "Exposed Keys",
    impact: 5,
    likelihood: 4,
    description: "Active access keys assigned to administrative accounts that haven't registered API activity in over 90 days. High compromise potential."
  },
  {
    id: "risk-3",
    title: "Wildcard permission attached to sensitive S3 buckets",
    severity: "HIGH",
    category: "Excessive Permissions",
    impact: 4,
    likelihood: 4,
    description: "Statements allowing s3:* on production buckets open access vectors to non-authorized roles. Violates least privilege limits."
  },
  {
    id: "risk-4",
    title: "Cross-Account trust role lacks external ID",
    severity: "MEDIUM",
    category: "Cross-Account",
    impact: 3,
    likelihood: 4,
    description: "Connected third-party trust relationships created without mandatory ExternalId parameters increase exposure to Confused Deputy attacks."
  },
  {
    id: "risk-5",
    title: "MFA disabled on active console user profile",
    severity: "MEDIUM",
    category: "Access Control",
    impact: 4,
    likelihood: 2,
    description: "IAM user has active web console password login capability but has not configured multi-factor authentication (MFA) credentials."
  }
];

export default function RiskAssessmentPage() {
  const [selectedRisk, setSelectedRisk] = useState(RISK_FINDINGS[0]);

  const severityStyles = {
    CRITICAL: "bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]",
    HIGH: "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]",
    MEDIUM: "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]",
    INFO: "bg-primary/10 border-primary/20 text-primary"
  };

  const getHeatmapCellColor = (x, y) => {
    // x = Likelihood, y = Impact (1 to 5)
    const product = x * y;
    if (product >= 16) return "bg-[#DC2626]/20 border-[#DC2626]/40 hover:bg-[#DC2626]/40";
    if (product >= 8) return "bg-[#F59E0B]/20 border-[#F59E0B]/40 hover:bg-[#F59E0B]/40";
    return "bg-primary/10 border-primary/30 hover:bg-primary/20";
  };

  const isRiskInCell = (risk, x, y) => {
    return risk.likelihood === x && risk.impact === y;
  };

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-textMain flex items-center gap-2 uppercase tracking-tight">
                <ShieldAlert className="h-5 w-5 text-primary" />
                Vulnerability Risk Assessment
              </h1>
              <p className="mt-0.5 text-xs text-muted">
                Analyze vulnerability vectors based on calculated exploitability matrices.
              </p>
            </div>

            {/* Matrix & Detail Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Heatmap Matrix (Left) */}
              <div className="lg:col-span-7 glass-card rounded-lg p-5 space-y-4">
                <div>
                  <h2 className="text-xs font-bold text-textMain uppercase tracking-wider">Likelihood vs. Impact Heatmap</h2>
                  <p className="text-[10px] text-muted">Hover or click highlighted cells to review classified vulnerabilities.</p>
                </div>

                <div className="flex flex-col space-y-1">
                  
                  {/* Grid Y Axis (Impact) */}
                  {[5, 4, 3, 2, 1].map((y) => (
                    <div key={y} className="flex items-center space-x-1">
                      {/* Y Label */}
                      <span className="w-6 text-[9px] font-mono font-bold text-muted text-center shrink-0">{y}</span>
                      
                      {/* X Cells */}
                      {[1, 2, 3, 4, 5].map((x) => {
                        const cellRisks = RISK_FINDINGS.filter((r) => isRiskInCell(r, x, y));
                        const hasRisk = cellRisks.length > 0;
                        return (
                          <div
                            key={x}
                            onClick={() => hasRisk && setSelectedRisk(cellRisks[0])}
                            className={`flex-1 h-12 rounded-[6px] border flex items-center justify-center cursor-pointer transition-fast relative font-mono text-[10px] font-bold ${getHeatmapCellColor(x, y)} ${
                              hasRisk ? "ring-1 ring-primary/60 scale-[1.02]" : "opacity-40"
                            }`}
                          >
                            {hasRisk ? `${cellRisks.length} Risk` : ""}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* X Axis Labels */}
                  <div className="flex items-center space-x-1 pt-1">
                    <span className="w-6 shrink-0" />
                    {[1, 2, 3, 4, 5].map((x) => (
                      <span key={x} className="flex-1 text-[9px] font-mono font-bold text-muted text-center">{x}</span>
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-muted px-8 pt-1.5 uppercase font-mono tracking-wider">
                    <span>Likelihood →</span>
                    <span>Impact ↑</span>
                  </div>

                </div>
              </div>

              {/* Risk Details Panel (Right) */}
              <div className="lg:col-span-5 glass-card rounded-lg p-5 space-y-4">
                <div>
                  <h2 className="text-xs font-bold text-textMain uppercase tracking-wider">Vulnerability Details</h2>
                  <p className="text-[10px] text-muted">Remediation parameters of the selected matrix risk.</p>
                </div>

                {selectedRisk ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-[6px] text-[8px] font-bold border uppercase tracking-wider font-mono ${severityStyles[selectedRisk.severity]}`}>
                          {selectedRisk.severity}
                        </span>
                        <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                          {selectedRisk.category}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-textMain leading-snug">
                        {selectedRisk.title}
                      </h3>
                    </div>

                    <div className="bg-pageBg rounded-[6px] p-3 border border-cardBorder text-xs leading-relaxed text-muted font-normal space-y-3">
                      <p>{selectedRisk.description}</p>
                      
                      <div className="border-t border-cardBorder/60 pt-3 grid grid-cols-2 gap-2 text-[10px] font-mono font-semibold">
                        <div>
                          <span className="text-muted block uppercase text-[8px]">Likelihood Index</span>
                          <span className="text-primary mt-0.5 block">{selectedRisk.likelihood} / 5</span>
                        </div>
                        <div>
                          <span className="text-muted block uppercase text-[8px]">Impact Rating</span>
                          <span className="text-primary mt-0.5 block">{selectedRisk.impact} / 5</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs bg-primary/5 border border-primary/20 p-3 rounded-[6px] leading-relaxed">
                      <Zap className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-[11px] text-muted font-normal">
                        Vektra AI chatbot is pre-loaded with this vulnerability context. Click Chatbot in the sidebar to generate a least-privilege policy patch.
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="text-xs text-muted py-8 text-center italic">
                    Select a risk block in the matrix to inspect.
                  </div>
                )}
              </div>

            </div>

            {/* List View of Findings */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Classified IAM Attack Vectors</h2>
              <div className="space-y-2.5">
                {RISK_FINDINGS.map((risk) => (
                  <div
                    key={risk.id}
                    onClick={() => setSelectedRisk(risk)}
                    className={`p-4 rounded-lg border cursor-pointer transition-fast flex items-center justify-between gap-4 ${
                      selectedRisk.id === risk.id 
                        ? "bg-cardSurface border-primary/30" 
                        : "bg-cardSurface/40 border-cardBorder hover:border-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-[6px] shrink-0 ${
                        risk.severity === "CRITICAL" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                      }`}>
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-textMain truncate block">{risk.title}</span>
                        <span className="text-[9px] text-muted font-mono uppercase block mt-0.5">{risk.category}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-[6px] text-[8px] font-bold border uppercase tracking-wider font-mono ${severityStyles[risk.severity]}`}>
                        {risk.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
