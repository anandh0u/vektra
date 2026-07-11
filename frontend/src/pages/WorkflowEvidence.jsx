import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  ArrowLeft,
  Zap,
  Database,
  Bot,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Box,
  Wrench,
  BarChart3,
  Cpu,
  Loader2,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

const STEP_CONFIG = [
  { name: "step-1-parse", label: "Parse Policy", icon: Search },
  { name: "step-2-graph", label: "Build Graph", icon: Layers },
  { name: "step-3-neo4j", label: "Save to Neo4j", icon: Database },
  { name: "step-3-base44", label: "Save to Base44", icon: Box },
  { name: "step-4-agents", label: "Run Analysts", icon: Bot },
  { name: "step-5-fixes", label: "Generate Fixes", icon: Wrench },
  { name: "step-6-score", label: "Score Risk", icon: BarChart3 },
  { name: "step-7-finalize", label: "Finalize", icon: CheckCircle2 },
];

export default function WorkflowEvidencePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { isDemoMode } = useVektraStore();

  const [workflowState, setWorkflowState] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflowState = async () => {
      try {
        const response = await fetch(`${API}/api/workflow/status/${sessionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch workflow state");
        }
        const data = await response.json();
        setWorkflowState(data);
      } catch (error) {
        console.error("Error fetching workflow state:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowState();
  }, [sessionId]);

  const toggleStep = (stepName) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepName]: !prev[stepName],
    }));
  };

  const exportEvidence = () => {
    if (!workflowState) return;

    const evidence = {
      session_id: sessionId,
      workflow_state: workflowState,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-evidence-${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const calculateParallelExecution = () => {
    if (!workflowState?.step_timings) return null;

    const step3n = workflowState.step_timings["step-3-neo4j"] || 120;
    const step3b = workflowState.step_timings["step-3-base44"] || 80;

    const maxTime = Math.max(step3n, step3b);
    const sequentialTime = step3n + step3b;
    const timeSaved = sequentialTime - maxTime;

    return {
      step3n,
      step3b,
      maxTime,
      sequentialTime,
      timeSaved,
    };
  };

  const getGanttData = () => {
    if (!workflowState?.step_timings) return { items: [], totalLength: 1 };
    const timings = workflowState.step_timings;
    
    let currentOffset = 0;
    const items = [];
    
    // Step 1 & 2
    for (let i = 0; i < 2; i++) {
      const name = STEP_CONFIG[i].name;
      const duration = timings[name] || 60;
      items.push({ name, label: STEP_CONFIG[i].label, start: currentOffset, duration });
      currentOffset += duration;
    }
    
    // Parallel Steps 3A/3B
    const dur3n = timings["step-3-neo4j"] || 120;
    const dur3b = timings["step-3-base44"] || 80;
    items.push({ name: "step-3-neo4j", label: "Save to Neo4j (3A)", start: currentOffset, duration: dur3n, isParallel: true });
    items.push({ name: "step-3-base44", label: "Save to Base44 (3B)", start: currentOffset, duration: dur3b, isParallel: true });
    
    currentOffset += Math.max(dur3n, dur3b);
    
    // Steps 4 through 7
    for (let i = 4; i < STEP_CONFIG.length; i++) {
      const name = STEP_CONFIG[i].name;
      const duration = timings[name] || 100;
      items.push({ name, label: STEP_CONFIG[i].label, start: currentOffset, duration });
      currentOffset += duration;
    }
    
    return { items, totalLength: currentOffset };
  };

  const parallelData = calculateParallelExecution();
  const { items: ganttItems, totalLength: ganttTotalLength } = getGanttData();

  if (loading) {
    return (
      <div className="min-h-screen bg-pageBg flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted font-mono uppercase tracking-wider">Retrieving workflow telemetry...</p>
        </div>
      </div>
    );
  }

  if (!workflowState) {
    return (
      <div className="min-h-screen bg-pageBg flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xs text-muted font-mono">No workflow logs registered for this session.</p>
          <button
            onClick={() => navigate("/")}
            className="h-9 px-4 bg-cardSurface hover:bg-[#1A1F2B] border border-cardBorder text-textMain rounded-[6px] text-xs font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalDuration = Object.values(workflowState.step_timings || {}).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

  return (
    <div className="min-h-screen bg-pageBg flex flex-col text-textMain select-none selection:bg-primary/20">
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-cardBorder bg-[#0B0E14] z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-[6px] bg-cardSurface border border-cardBorder hover:bg-bgElevated transition-fast"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-muted" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-sm text-textMain uppercase tracking-wider">
                Workflow Telemetry Audit
              </h1>
              {isDemoMode && (
                <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  Demo
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted font-mono">session_id: {sessionId}</p>
          </div>
        </div>
        <button
          onClick={exportEvidence}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-cardSurface border border-cardBorder rounded-[6px] hover:bg-bgElevated transition-fast text-xs font-semibold"
        >
          <Download className="w-4 h-4 text-primary" />
          <span>Export JSON Audit</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-8 py-10 space-y-8">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted text-[10px] uppercase font-bold tracking-wider">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Pipeline Duration</span>
            </div>
            <p className="text-lg font-bold text-textMain font-mono">{totalDuration}ms</p>
          </div>
          
          <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted text-[10px] uppercase font-bold tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Registry Nodes</span>
            </div>
            <p className="text-lg font-bold text-textMain font-mono">
              {workflowState.steps_complete?.length || 0} / {workflowState.total_steps || 8}
            </p>
          </div>

          <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted text-[10px] uppercase font-bold tracking-wider">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Parallel Tasks</span>
            </div>
            <p className="text-lg font-bold text-textMain font-mono">2 Concurrent</p>
          </div>

          <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted text-[10px] uppercase font-bold tracking-wider">
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span>Violations Map</span>
            </div>
            <p className="text-lg font-bold text-textMain font-mono">
              {workflowState.result?.stats?.vulnerabilities_found || 0} Detected
            </p>
          </div>
        </div>

        {/* Math & Parallel Execution Evidence */}
        {parallelData && (
          <div className="bg-[#12161F] border border-cardBorder rounded-[6px] p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider">
              <Zap className="w-4 h-4 text-primary" />
              <h3>Parallel Savings Computation</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-cardBorder/30 pb-1.5">
                  <span className="text-muted">Save to Neo4j (3A):</span>
                  <span className="text-textMain font-mono">{parallelData.step3n}ms</span>
                </div>
                <div className="flex justify-between border-b border-cardBorder/30 pb-1.5">
                  <span className="text-muted">Save to Base44 (3B):</span>
                  <span className="text-textMain font-mono">{parallelData.step3b}ms</span>
                </div>
                <div className="flex justify-between border-b border-cardBorder/30 pb-1.5">
                  <span className="text-muted">Concurrent Execution:</span>
                  <span className="text-primary font-mono font-semibold">{parallelData.maxTime}ms (max)</span>
                </div>
                <div className="flex justify-between border-b border-cardBorder/30 pb-1.5">
                  <span className="text-muted">Sequential Model Estimate:</span>
                  <span className="text-textMain font-mono">{parallelData.sequentialTime}ms (sum)</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-primary font-semibold">Total Efficiency Gain:</span>
                  <span className="text-primary font-mono font-bold">+{parallelData.timeSaved}ms</span>
                </div>
              </div>

              {/* Math Formula Display */}
              <div className="bg-pageBg border border-cardBorder p-4 rounded-[6px] space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block font-mono">CONCURRENCY MATH LOG</span>
                <div className="font-mono text-xs text-primary bg-[#12161F]/40 p-2.5 rounded-[6px] border border-cardBorder/50">
                  savings = (t_3a + t_3b) - max(t_3a, t_3b)
                  <br />
                  savings = ({parallelData.step3n} + {parallelData.step3b}) - {parallelData.maxTime} = {parallelData.timeSaved}ms
                </div>
                <p className="text-[11px] text-muted leading-relaxed font-normal">
                  By fanning out execution threads during step 3, we prevent the Neo4j writer from blocking Base44 metadata anchoring.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Visual Gantt Overlap Timeline */}
        <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Gantt Pipeline Overlap Chart</span>
            <span className="text-[10px] text-muted font-mono">scale: {ganttTotalLength}ms total</span>
          </div>

          <div className="space-y-4 pt-2">
            {ganttItems.map((item, idx) => {
              const leftPct = (item.start / ganttTotalLength) * 100;
              const widthPct = Math.max(2, (item.duration / ganttTotalLength) * 100);
              
              return (
                <div key={`${item.name}-${idx}`} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-textMain">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isParallel ? "bg-primary animate-pulse" : "bg-muted"}`} />
                      {item.label}
                    </span>
                    <span className="font-mono text-muted text-[10px]">{item.duration}ms</span>
                  </div>
                  <div className="w-full h-4 bg-pageBg rounded-[4px] border border-cardBorder overflow-hidden relative">
                    <div 
                      className={`h-full rounded-[4px] absolute ${item.isParallel ? "bg-primary" : "bg-muted/30"}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution Timeline table */}
        <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-5 space-y-4">
          <span className="text-xs font-bold text-muted uppercase tracking-wider block">Detailed Step telemetry logs</span>
          <div className="border border-cardBorder rounded-[6px] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#111113] border-b border-cardBorder">
                  <th className="text-left p-3.5 text-[10px] font-bold text-muted uppercase tracking-wider">Step Name</th>
                  <th className="text-left p-3.5 text-[10px] font-bold text-muted uppercase tracking-wider">State</th>
                  <th className="text-right p-3.5 text-[10px] font-bold text-muted uppercase tracking-wider">Execution Timing</th>
                </tr>
              </thead>
              <tbody>
                {STEP_CONFIG.map((step) => {
                  const stepData = workflowState.step_timings?.[step.name];
                  const status = workflowState.steps_complete?.includes(step.name)
                    ? "complete"
                    : workflowState.steps_failed?.includes(step.name)
                    ? "failed"
                    : "pending";

                  return (
                    <tr key={step.name} className="border-b border-cardBorder last:border-0 hover:bg-[#1A1F2B]/40 transition-fast">
                      <td className="p-3.5 text-textMain font-semibold">{step.label}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            status === "complete"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : status === "failed"
                              ? "bg-[#FF5C4D]/10 text-[#FF5C4D] border-[#FF5C4D]/20"
                              : "bg-[#27272A]/50 text-muted border-cardBorder"
                          }`}
                        >
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-muted">
                        {stepData !== undefined ? `${stepData}ms` : "PENDING"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-cardBorder flex items-center justify-center text-[10px] text-muted bg-[#0B0E14] font-mono">
        VEKTRA TELEMETRY AUDIT CONSOLE • SECURITY OPERATIONS CENTRE
      </footer>
    </div>
  );
}
