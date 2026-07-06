import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import {
  Search,
  Network,
  Database,
  Box,
  Bot,
  Wrench,
  BarChart3,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  Clock,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

const STEP_CONFIG = [
  { name: "step-1-parse", label: "Parsing policy", icon: Search },
  { name: "step-2-graph", label: "Building graph", icon: Network },
  { name: "step-3-neo4j", label: "Saving to Neo4j", icon: Database },
  { name: "step-3-base44", label: "Saving history", icon: Box },
  { name: "step-4-agents", label: "Running analysts", icon: Bot },
  { name: "step-5-fixes", label: "Generating fixes", icon: Wrench },
  { name: "step-6-score", label: "Scoring risk", icon: BarChart3 },
  { name: "step-7-finalize", label: "Finalizing results", icon: CheckCircle2 },
];

export default function AnalyzingPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { setAnalysisResult } = useVektraStore();

  const [workflowState, setWorkflowState] = useState({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFailed, setIsFailed] = useState(false);
  const [failedStep, setFailedStep] = useState(null);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let pollInterval;

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API}/api/workflow/status/${sessionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch workflow status");
        }

        const data = await response.json();
        setWorkflowState(data);

        if (data.is_complete) {
          clearInterval(pollInterval);
          // Store result in Zustand and navigate
          if (data.result) {
            setAnalysisResult(data.result);
          }
          setTimeout(() => navigate("/analyze"), 500);
        }

        if (data.is_failed) {
          setIsFailed(true);
          setFailedStep(data.steps_failed?.[0] || "Unknown step");
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Polling error:", error);
        setIsFailed(true);
        setFailedStep("Connection error");
        clearInterval(pollInterval);
      }
    };

    pollStatus();
    pollInterval = setInterval(pollStatus, 2000);

    return () => clearInterval(pollInterval);
  }, [sessionId, navigate, setAnalysisResult]);

  const getStepStatus = (stepName) => {
    const stepData = workflowState.step_timings?.[stepName];
    if (stepData !== undefined) {
      return "complete";
    }
    if (workflowState.steps_complete?.includes(stepName)) {
      return "complete";
    }
    if (workflowState.steps_failed?.includes(stepName)) {
      return "failed";
    }
    // Check if any previous step is complete to determine if this is running
    const stepIndex = STEP_CONFIG.findIndex((s) => s.name === stepName);
    const previousSteps = STEP_CONFIG.slice(0, stepIndex);
    const hasPreviousComplete = previousSteps.some((s) =>
      workflowState.steps_complete?.includes(s.name)
    );
    if (hasPreviousComplete && !isFailed) {
      return "running";
    }
    return "pending";
  };

  const renderStepIcon = (status) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />;
      default:
        return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const renderStepRow = (step, index) => {
    const status = getStepStatus(step.name);
    const duration = workflowState.step_timings?.[step.name];
    const Icon = step.icon;

    return (
      <div
        key={step.name}
        className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-all duration-300 ${
          status === "complete"
            ? "bg-green-500/5 border-green-500/20"
            : status === "failed"
            ? "bg-red-500/5 border-red-500/20"
            : status === "running"
            ? "bg-violet-500/5 border-violet-500/20"
            : "bg-[#141628]/40 border-[#1e2240]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-[#0d0f1a]">
            {renderStepIcon(status)}
          </div>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted" />
            <span className="text-sm text-slate-200">{step.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {duration !== undefined && (
            <span className="text-xs font-mono text-muted">{duration}ms</span>
          )}
          {status === "running" && (
            <span className="text-xs text-violet-400 font-medium">Running...</span>
          )}
          {status === "complete" && (
            <span className="text-xs text-green-400 font-medium">Done</span>
          )}
          {status === "failed" && (
            <span className="text-xs text-red-400 font-medium">Failed</span>
          )}
        </div>
      </div>
    );
  };

  const progressPercent = workflowState.progress_pct || 0;
  const completedSteps = workflowState.steps_complete?.length || 0;
  const totalSteps = workflowState.total_steps || 8;

  const handleRetry = () => {
    navigate("/");
  };

  if (isFailed) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Workflow Failed</h2>
            <p className="text-muted text-sm">
              Step failed: <span className="text-red-400 font-mono">{failedStep}</span>
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f1a] flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-[#1e2240] bg-[#0a0c16]/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-lg">
            <Network className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-xl tracking-wider bg-gradient-to-r from-white via-slate-200 to-secondary bg-clip-text text-transparent">
            VEKTRA
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto px-6 py-12 space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="font-heading font-bold text-2xl text-white">
            Analyzing your policy...
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono text-muted bg-[#141628] px-3 py-1 rounded-full">
              Session: {sessionId}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="h-2 bg-[#141628] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>{completedSteps} of {totalSteps} steps complete</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="w-full space-y-3">
          {/* Sequential steps */}
          {STEP_CONFIG.slice(0, 2).map((step, index) => renderStepRow(step, index))}

          {/* Parallel steps 3 */}
          <div className="grid grid-cols-2 gap-3">
            {STEP_CONFIG.slice(2, 4).map((step, index) => renderStepRow(step, index + 2))}
          </div>

          {/* Sequential steps 4-7 */}
          {STEP_CONFIG.slice(4).map((step, index) => renderStepRow(step, index + 4))}
        </div>

        {/* Elapsed Time */}
        <div className="flex items-center gap-2 text-muted text-sm">
          <Clock className="w-4 h-4" />
          <span>Total elapsed: {elapsedTime}s</span>
        </div>

        {/* Workflow Run ID */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted">Workflow Run: {sessionId}</p>
          {import.meta.env.VITE_RENDER_DASHBOARD && (
            <a
              href={import.meta.env.VITE_RENDER_DASHBOARD}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View execution log →
            </a>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#1e2240]/40 flex items-center justify-center text-[10px] text-muted">
        HACKHAZARDS '26 • Trust, Identity & Security • Powered by Neo4j & Sarvam
      </footer>
    </div>
  );
}
