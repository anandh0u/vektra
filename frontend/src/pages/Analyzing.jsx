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
  Activity,
  Cpu,
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
  const { setAnalysisResult, isDemoMode } = useVektraStore();

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
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-[#FF5C4D]" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <Circle className="w-4 h-4 text-[#232838]" />;
    }
  };

  const renderStepRow = (step, index) => {
    const status = getStepStatus(step.name);
    const duration = workflowState.step_timings?.[step.name];
    const Icon = step.icon;

    return (
      <div
        key={step.name}
        className={`flex items-center justify-between py-2.5 px-3.5 rounded-[6px] border transition-fast ${
          status === "complete"
            ? "bg-[#12161F]/60 border-cardBorder text-textMain"
            : status === "failed"
            ? "bg-[#FF5C4D]/5 border-[#FF5C4D]/20 text-textMain"
            : status === "running"
            ? "bg-bgElevated border-primary/30 text-textMain"
            : "bg-[#12161F]/20 border-cardBorder/40 text-muted"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0">
            {renderStepIcon(status)}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-3.5 h-3.5 text-muted shrink-0" />
            <span className="text-xs font-semibold truncate">{step.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {duration !== undefined && (
            <span className="text-[10px] font-mono text-muted">{duration}ms</span>
          )}
          {status === "running" && (
            <span className="text-[10px] text-primary font-mono font-semibold animate-pulse">RUNNING</span>
          )}
          {status === "complete" && (
            <span className="text-[10px] text-primary font-mono font-semibold">DONE</span>
          )}
          {status === "failed" && (
            <span className="text-[10px] text-[#FF5C4D] font-mono font-semibold">FAIL</span>
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
      <div className="min-h-screen bg-pageBg flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-12 h-12 mx-auto rounded-[6px] bg-[#FF5C4D]/10 border border-[#FF5C4D]/25 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-[#FF5C4D]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-textMain tracking-tight">Workflow Failed</h2>
            <p className="text-muted text-xs">
              Error logged in step: <span className="text-[#FF5C4D] font-mono font-semibold">{failedStep}</span>
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="w-full h-10 bg-cardSurface hover:bg-[#1A1F2B] border border-[#FF5C4D]/30 text-[#FF5C4D] font-semibold rounded-[6px] transition-fast text-xs"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pageBg flex flex-col text-textMain selection:bg-primary/20">
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-cardBorder bg-[#0B0E14] z-30">
        <div className="flex items-center gap-2.5">
          <div className="bg-cardSurface border border-cardBorder p-1.5 rounded-[6px]">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <span className="font-sans font-bold text-sm tracking-wide text-textMain">
            VEKTRA
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-3xl w-full mx-auto px-8 py-16 space-y-10">
        
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-primary/10 border border-primary/20 text-primary rounded-[6px] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-center max-w-md mx-auto font-mono flex items-center justify-center gap-2">
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
            <span>Running in Demo Mode (Sample AWS IAM Policy)</span>
          </div>
        )}

        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="font-sans font-bold text-2xl tracking-tight text-textMain">
            Analyzing Access Policy
          </h1>
          <div className="flex items-center justify-center">
            <span className="text-[10px] font-mono text-muted bg-[#12161F] border border-cardBorder px-3 py-1 rounded-[6px]">
              session_id: {sessionId}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="h-1.5 bg-cardSurface rounded-full overflow-hidden border border-cardBorder">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-muted uppercase font-mono">
            <span>{completedSteps} / {totalSteps} steps completed</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="w-full space-y-3.5">
          {/* Parse and Graph build steps */}
          {STEP_CONFIG.slice(0, 2).map((step, index) => renderStepRow(step, index))}

          {/* Parallel Execution visual connectors */}
          <div className="border border-[#232838] bg-[#12161F]/20 p-4 rounded-[6px] space-y-3 relative">
            <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 h-8 w-[2px] bg-primary" />
            <div className="flex justify-between items-center text-[9px] font-bold text-muted uppercase tracking-widest font-mono">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-primary animate-pulse" />
                Parallel Processing Hub
              </span>
              <span className="text-primary">2x Concurrency Execution</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {STEP_CONFIG.slice(2, 4).map((step, index) => renderStepRow(step, index + 2))}
            </div>
          </div>

          {/* Agents, Fixes, Score, Finalize */}
          {STEP_CONFIG.slice(4).map((step, index) => renderStepRow(step, index + 4))}
        </div>

        {/* Elapsed Time */}
        <div className="flex items-center gap-2 text-muted text-xs font-semibold font-mono uppercase bg-cardSurface/50 border border-cardBorder px-3 py-1.5 rounded-[6px]">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>ELAPSED SCAN TIME: {elapsedTime}s</span>
        </div>

        {/* Workflow Run Details */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-muted font-mono">system_run_token: {sessionId}</p>
        </div>

      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-cardBorder flex items-center justify-center text-[10px] text-muted bg-[#0B0E14] font-mono">
        VEKTRA PIPELINE ENGINE • SECURITY OPERATIONS ENVIRONMENT
      </footer>
    </div>
  );
}
