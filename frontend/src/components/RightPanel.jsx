import React from "react";
import { useVektraStore } from "../store/vektraStore";
import CodeBlock from "./CodeBlock";
import ExploitabilityBar from "./ExploitabilityBar";
import ChatWidget from "./ChatWidget";
import UpgradePrompt from "./UpgradePrompt";
import { Network } from "lucide-react";

export default function RightPanel() {
  const { 
    selectedNodeId, 
    selectedConflictId, 
    nodes, 
    conflicts,
    format,
    stats,
    upgradePrompt,
    selectConflict
  } = useVektraStore();

  // Find selected node details
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data || selectedNode || {};
  
  // Find selected vulnerability details
  const selectedConflict = conflicts.find(c => c.id === selectedConflictId);

  // If node is selected, find its associated vulnerabilities
  const nodeConflicts = selectedNodeId 
    ? conflicts.filter(c => c.affected_rules.includes(selectedNodeId)) 
    : [];

  const severityColors = {
    CRITICAL: "text-danger border-danger/30 bg-danger/10",
    WARNING: "text-warning border-warning/30 bg-warning/10",
    INFO: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    SAFE: "text-safe border-safe/30 bg-safe/10"
  };

  const confidenceColors = {
    HIGH: "bg-safe/10 text-safe border-safe/30",
    MEDIUM: "bg-warning/10 text-warning border-warning/30",
    LOW: "bg-danger/10 text-danger border-danger/30"
  };

  return (
    <aside className="w-80 border-l border-[#1e2240] bg-[#0a0c16] flex flex-col h-[calc(100vh-4rem)] select-none">
      {/* Detail Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5">
        
        {/* Node View State */}
        {selectedNode && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                Node Properties
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${severityColors[selectedNodeData.severity || "SAFE"]}`}>
                {selectedNodeData.severity || "SAFE"}
              </span>
            </div>
            
            <h3 className="font-heading font-semibold text-slate-100 text-sm break-all">
              {selectedNode.id}
            </h3>

            {/* Rules Details */}
            <div className="space-y-3 bg-[#141628]/60 p-3 rounded-lg border border-cardBorder text-[11px] leading-relaxed">
              <div>
                <span className="text-muted font-semibold block mb-0.5">EFFECT</span>
                <span className={`font-bold ${selectedNodeData.effect === "Deny" ? "text-danger" : "text-safe"}`}>
                  {selectedNodeData.effect}
                </span>
              </div>
              <div>
                <span className="text-muted font-semibold block mb-0.5">ACTIONS / VERBS</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNodeData.actions?.map((act, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-[#0d0f1a] text-slate-300 font-mono text-[10px] rounded border border-cardBorder">
                      {act}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted font-semibold block mb-0.5">RESOURCES</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNodeData.resources?.map((res, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-[#0d0f1a] text-slate-300 font-mono text-[10px] rounded border border-cardBorder max-w-full truncate" title={res}>
                      {res}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted font-semibold block mb-0.5">PRINCIPALS</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNodeData.principals?.map((prn, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-[#0d0f1a] text-slate-300 font-mono text-[10px] rounded border border-cardBorder">
                      {prn}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted font-semibold block mb-0.5">CENTRALITY SCORE</span>
                <span className="font-mono text-slate-300">
                  {(selectedNodeData.centrality_score || 0).toFixed(4)}
                </span>
              </div>
              {selectedNodeData.source_file && (
                <div>
                  <span className="text-muted font-semibold block mb-0.5">SOURCE</span>
                  <span className="text-slate-300">
                    {selectedNodeData.source_file}
                  </span>
                </div>
              )}
            </div>

            {/* Associated Node Vulnerabilities */}
            {nodeConflicts.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Active Vulnerabilities ({nodeConflicts.length})
                </span>
                <div className="space-y-1.5">
                  {nodeConflicts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectConflict(c.id)}
                      className="w-full text-left p-2 bg-cardSurface hover:bg-[#1e2240] rounded border border-cardBorder transition-colors flex items-center justify-between text-xs"
                    >
                      <span className="truncate text-slate-200 pr-2 font-semibold">
                        {c.title}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold flex-shrink-0 ${
                        c.severity === "CRITICAL" ? "bg-danger/20 text-danger" : "bg-warning/20 text-warning"
                      }`}>
                        {c.severity}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vulnerability View State */}
        {selectedConflict && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                Vulnerability Details
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${severityColors[selectedConflict.severity]}`}>
                {selectedConflict.severity}
              </span>
            </div>

            <h3 className="font-heading font-semibold text-slate-100 text-sm">
              {selectedConflict.title}
            </h3>

            {upgradePrompt && <UpgradePrompt />}

            {/* Exploitability Segment */}
            {!upgradePrompt && selectedConflict.exploitability_score !== undefined && (
              <ExploitabilityBar score={selectedConflict.exploitability_score} />
            )}

            {/* Agent 1 Danger Section */}
            {!upgradePrompt && selectedConflict.danger_summary && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Danger Analysis
                </span>
                <div className={`p-3 rounded-lg border-l-4 bg-[#0d0f1a] text-xs text-slate-300 leading-relaxed ${
                  selectedConflict.severity === "CRITICAL" ? "border-danger" : "border-warning"
                }`}>
                  {selectedConflict.danger_summary}
                </div>
                {selectedConflict.attack_scenario && (
                  <p className="text-[10px] text-muted italic leading-relaxed pt-1">
                    <span className="font-semibold text-slate-400 not-italic">Scenario: </span>
                    {selectedConflict.attack_scenario}
                  </p>
                )}
              </div>
            )}

            {/* Agent 2 Fix Section */}
            {!upgradePrompt && selectedConflict.fixed_policy_block && (
              <div className="space-y-2 pt-2 border-t border-cardBorder">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    Remediation Block
                  </span>
                  {selectedConflict.confidence && (
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${confidenceColors[selectedConflict.confidence]}`}>
                      CONF: {selectedConflict.confidence}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted leading-relaxed">
                  {selectedConflict.fix_description}
                </p>
                <CodeBlock 
                  code={selectedConflict.fixed_policy_block} 
                  language={format === "iam" ? "json" : "yaml"} 
                />
              </div>
            )}

            {upgradePrompt && (
              <div className="rounded-lg border border-[#1e2240] bg-[#0d0f1a] p-3 text-[11px] leading-relaxed text-muted">
                Basic graph detection found this issue. Pro adds attack scenarios, remediation blocks, confidence scoring, and compliance context.
              </div>
            )}
          </div>
        )}

        {/* Empty View State */}
        {!selectedNode && !selectedConflict && (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <Network className="w-10 h-10 text-muted/30 mb-2" />
            <h4 className="text-xs font-semibold text-slate-300 mb-1">
              Select an Element
            </h4>
            <p className="text-[11px] text-muted leading-relaxed max-w-[200px]">
              Click a node in the graph, or choose a vulnerability in the list to reveal agent reviews.
            </p>

            {upgradePrompt && (
              <div className="mt-6 w-full">
                <UpgradePrompt />
              </div>
            )}

            {/* Agent 3 Risk Scorer priorities summary when nothing selected */}
            {!upgradePrompt && stats.top_priorities && stats.top_priorities.length > 0 && (
              <div className="w-full mt-6 text-left border-t border-cardBorder/60 pt-4 space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Top Priorities (Risk Scorer)
                </span>
                <div className="space-y-1.5">
                  {stats.top_priorities.map((item, idx) => (
                    <div key={idx} className="flex gap-2 text-[10px] text-slate-300 leading-relaxed bg-[#141628]/40 p-2 rounded border border-cardBorder/40">
                      <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-[9px] mt-0.5">
                        {idx + 1}
                      </div>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Ask Vektra Chat widget at the bottom */}
      <div className="p-4 border-t border-[#1e2240] bg-[#0a0c16]">
        <ChatWidget />
      </div>
    </aside>
  );
}
