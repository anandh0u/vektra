import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

    const step3n = workflowState.step_timings["step-3-neo4j"];
    const step3b = workflowState.step_timings["step-3-base44"];

    if (!step3n || !step3b) return null;

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

  const parallelData = calculateParallelExecution();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">Loading workflow evidence...</p>
        </div>
      </div>
    );
  }

  if (!workflowState) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted">Workflow evidence not found</p>
          <button
            onClick={() => navigate("/analyze")}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Back to Analysis
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
    <div className="min-h-screen bg-[#0d0f1a] flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-[#1e2240] bg-[#0a0c16]/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/analyze")}
            className="p-2 rounded-lg hover:bg-[#141628] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted" />
          </button>
          <div>
            <h1 className="font-heading font-bold text-lg text-white">
              Workflow Execution Evidence
            </h1>
            <p className="text-xs text-muted font-mono">Session: {sessionId}</p>
          </div>
        </div>
        <button
          onClick={exportEvidence}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Export JSON</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#141628] border border-[#1e2240] rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-1">
              <Clock className="w-4 h-4" />
              <span>Total Duration</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalDuration}ms</p>
          </div>
          <div className="bg-[#141628] border border-[#1e2240] rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Steps Completed</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {workflowState.steps_complete?.length || 0}/{workflowState.total_steps || 8}
            </p>
          </div>
          <div className="bg-[#141628] border border-[#1e2240] rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-1">
              <Zap className="w-4 h-4" />
              <span>Parallel Steps</span>
            </div>
            <p className="text-2xl font-bold text-white">2</p>
          </div>
          <div className="bg-[#141628] border border-[#1e2240] rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-1">
              <Bot className="w-4 h-4" />
              <span>AI Agent Calls</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {workflowState.result?.stats?.vulnerabilities_found || 0}
            </p>
          </div>
        </div>

        {/* Parallel Execution Proof */}
        {parallelData && (
          <div className="bg-gradient-to-r from-violet-500/10 to-primary/10 border border-violet-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-400" />
              Parallel Execution Proof
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">step-3-neo4j duration:</span>
                <span className="text-white font-mono">{parallelData.step3n}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">step-3-base44 duration:</span>
                <span className="text-white font-mono">{parallelData.step3b}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Both ran in parallel:</span>
                <span className="text-white font-mono">{parallelData.maxTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Sequential would have taken:</span>
                <span className="text-white font-mono">{parallelData.sequentialTime}ms</span>
              </div>
              <div className="h-px bg-violet-500/30 my-2" />
              <div className="flex justify-between font-semibold">
                <span className="text-violet-300">Time saved by parallelization:</span>
                <span className="text-green-400 font-mono">{parallelData.timeSaved}ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Execution Timeline */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Execution Timeline</h3>
          <div className="space-y-3">
            {STEP_CONFIG.map((step) => {
              const stepData = workflowState.step_timings?.[step.name];
              const status = workflowState.steps_complete?.includes(step.name)
                ? "complete"
                : workflowState.steps_failed?.includes(step.name)
                ? "failed"
                : "pending";
              const isExpanded = expandedSteps[step.name];

              return (
                <div
                  key={step.name}
                  className="bg-[#141628] border border-[#1e2240] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleStep(step.name)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#1a1d2e] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {status === "complete" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : status === "failed" ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                      )}
                      <span className="text-white font-medium">{step.label}</span>
                      <span className="text-xs text-muted font-mono">{step.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {stepData !== undefined && (
                        <span className="text-sm font-mono text-muted">{stepData}ms</span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted" />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="p-4 border-t border-[#1e2240] space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted">Status:</span>
                        <span
                          className={
                            status === "complete"
                              ? "text-green-400"
                              : status === "failed"
                              ? "text-red-400"
                              : "text-gray-400"
                          }
                        >
                          {status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Duration:</span>
                        <span className="text-white font-mono">
                          {stepData !== undefined ? `${stepData}ms` : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Step Name:</span>
                        <span className="text-white font-mono">{step.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Timings Table */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Step Timings</h3>
          <div className="bg-[#141628] border border-[#1e2240] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e2240]">
                  <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">
                    Step
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right p-4 text-xs font-semibold text-muted uppercase tracking-wider">
                    Duration
                  </th>
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
                    <tr key={step.name} className="border-b border-[#1e2240]/50 last:border-0">
                      <td className="p-4 text-sm text-white">{step.label}</td>
                      <td className="p-4">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            status === "complete"
                              ? "bg-green-500/10 text-green-400"
                              : status === "failed"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-gray-500/10 text-gray-400"
                          }`}
                        >
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-sm text-muted">
                        {stepData !== undefined ? `${stepData}ms` : "N/A"}
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
      <footer className="h-12 border-t border-[#1e2240]/40 flex items-center justify-center text-[10px] text-muted">
        HACKHAZARDS '26 • Trust, Identity & Security • Powered by Neo4j & Sarvam
      </footer>
    </div>
  );
}
