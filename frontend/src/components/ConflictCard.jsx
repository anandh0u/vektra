import React from "react";
import ExploitabilityBar from "./ExploitabilityBar";
import CodeBlock from "./CodeBlock";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export default function ConflictCard({ conflict, format }) {
  const {
    severity,
    type,
    title,
    danger_summary,
    attack_scenario,
    exploitability_score,
    fix_description,
    fixed_policy_block,
    confidence,
    affected_rules
  } = conflict;

  const severityBadges = {
    CRITICAL: {
      bg: "bg-danger/10",
      text: "text-danger border-danger/30",
      icon: AlertCircle,
      label: "CRITICAL"
    },
    WARNING: {
      bg: "bg-warning/10",
      text: "text-warning border-warning/30",
      icon: AlertTriangle,
      label: "WARNING"
    },
    INFO: {
      bg: "bg-blue-500/10",
      text: "text-blue-400 border-blue-500/30",
      icon: Info,
      label: "INFO"
    }
  };

  const badge = severityBadges[severity] || {
    bg: "bg-muted/10",
    text: "text-muted border-cardBorder",
    icon: Info,
    label: severity
  };
  
  const BadgeIcon = badge.icon;

  const confidenceColors = {
    HIGH: "bg-safe/10 text-safe border-safe/30",
    MEDIUM: "bg-warning/10 text-warning border-warning/30",
    LOW: "bg-danger/10 text-danger border-danger/30"
  };

  return (
    <div className="bg-cardSurface border border-cardBorder rounded-xl p-5 space-y-4 hover:border-slate-500/30 transition-all duration-300">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${badge.bg} ${badge.text}`}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </span>
          <span className="text-xs text-muted font-bold font-mono">
            {type}
          </span>
        </div>
        {exploitability_score !== undefined && exploitability_score !== null && (
          <div className="w-32">
            <ExploitabilityBar score={exploitability_score} />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-heading font-semibold text-slate-100 text-sm">
        {title}
      </h3>

      {/* Agent 1 outputs */}
      {danger_summary && (
        <div className="space-y-2">
          {/* Danger summary card with left border color */}
          <div className={`p-3 rounded-lg border-l-4 bg-[#0d0f1a] ${
            severity === "CRITICAL" ? "border-danger" : (severity === "WARNING" ? "border-warning" : "border-blue-500")
          }`}>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Danger Summary (Vulnerability Analyst)
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {danger_summary}
            </p>
          </div>

          {/* Attack scenario */}
          {attack_scenario && (
            <div className="text-xs text-muted/90 italic leading-relaxed">
              <span className="font-semibold text-slate-400 not-italic">Scenario: </span>
              {attack_scenario}
            </div>
          )}
        </div>
      )}

      {/* Agent 2 outputs */}
      {fixed_policy_block && (
        <div className="space-y-2 pt-2 border-t border-cardBorder">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Proposed Fix (Fix Engineer)
            </span>
            {confidence && (
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${confidenceColors[confidence] || "bg-[#1e2240] text-muted"}`}>
                CONFIDENCE: {confidence}
              </span>
            )}
          </div>
          <p className="text-xs text-muted leading-relaxed">
            {fix_description}
          </p>
          <CodeBlock code={fixed_policy_block} language={format === "iam" ? "json" : "yaml"} />
        </div>
      )}

      {/* Affected Rule IDs Footer */}
      {affected_rules && affected_rules.length > 0 && (
        <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-cardBorder/60">
          <span className="text-[9px] font-bold text-muted uppercase tracking-wider">
            Affected Nodes:
          </span>
          {affected_rules.map((ruleId) => (
            <span key={ruleId} className="px-2 py-0.5 rounded bg-[#1e2240] text-primary text-[10px] font-mono font-semibold">
              {ruleId}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
