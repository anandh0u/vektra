import React, { useState } from "react";
import { ArrowRight, CheckCircle2, GitCompareArrows, Menu, Play, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { getAuthHeaders, useVektraStore } from "../store/vektraStore";

const CURRENT_IAM = `{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ReadProductionArtifacts",
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::production-artifacts/*"]
  }]
}`;

const PROPOSED_IAM = `{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DeploymentConvenience",
    "Effect": "Allow",
    "Action": ["*"],
    "Resource": ["*"]
  }]
}`;

const CURRENT_K8S = `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-reader
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list"]`;

const PROPOSED_K8S = `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployment-operator
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]`;

const API_BASE = import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname) ? "" : "http://localhost:8000");

function ScoreCard({ label, data, accent }) {
  return (
    <div className="rounded-xl border border-cardBorder bg-cardSurface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
        <span className={`font-mono text-2xl font-bold ${accent}`}>{data.risk_score}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div><div className="font-mono text-sm text-danger">{data.critical}</div><div className="text-[10px] text-muted">Critical</div></div>
        <div><div className="font-mono text-sm text-warning">{data.warning}</div><div className="text-[10px] text-muted">Warning</div></div>
        <div><div className="font-mono text-sm text-textMain">{data.rules}</div><div className="text-[10px] text-muted">Rules</div></div>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const { setMobileSidebarOpen } = useVektraStore();
  const [format, setFormat] = useState("iam");
  const [current, setCurrent] = useState(CURRENT_IAM);
  const [proposed, setProposed] = useState(PROPOSED_IAM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const changeFormat = (next) => {
    setFormat(next);
    setCurrent(next === "iam" ? CURRENT_IAM : CURRENT_K8S);
    setProposed(next === "iam" ? PROPOSED_IAM : PROPOSED_K8S);
    setResult(null);
    setError("");
  };

  const runSimulation = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ current_policy: current, proposed_policy: proposed, format }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Simulation failed.");
      setResult(data);
    } catch (err) {
      setError(err.message || "Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const verdictStyle = result?.verdict === "BLOCK" ? "text-danger border-danger/30 bg-danger/10" :
    result?.verdict === "REVIEW" ? "text-warning border-warning/30 bg-warning/10" : "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";

  return (
    <div className="flex min-h-screen bg-pageBg text-textMain">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <TopBar />
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Sparkles className="h-4 w-4" /> Access Digital Twin</div>
              <h1 className="text-2xl sm:text-3xl">Permission change simulator</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">Compare the access graph before and after a proposed change. Vektra blocks newly introduced critical attack paths using deterministic policy analysis.</p>
            </div>
            <button onClick={() => setMobileSidebarOpen(true)} className="rounded-lg border border-cardBorder bg-cardSurface p-2 text-muted lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          </div>

          <div className="mb-4 flex w-fit rounded-lg border border-cardBorder bg-cardSurface p-1">
            {["iam", "k8s"].map(item => <button key={item} onClick={() => changeFormat(item)} className={`rounded-md px-4 py-2 text-xs font-bold uppercase ${format === item ? "bg-activeNav text-textMain" : "text-muted"}`}>{item === "iam" ? "AWS IAM" : "Kubernetes RBAC"}</button>)}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[{label:"Current policy", value:current, setter:setCurrent}, {label:"Proposed policy", value:proposed, setter:setProposed}].map(editor => (
              <label key={editor.label} className="block overflow-hidden rounded-xl border border-cardBorder bg-cardSurface">
                <span className="block border-b border-cardBorder px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">{editor.label}</span>
                <textarea value={editor.value} onChange={e => editor.setter(e.target.value)} spellCheck="false" className="h-72 w-full resize-y bg-transparent p-4 font-mono text-xs leading-6 text-textMain outline-none sm:h-80" />
              </label>
            ))}
          </div>

          {error && <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
          <button onClick={runSimulation} disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto">
            {loading ? <><GitCompareArrows className="h-4 w-4 animate-pulse" /> Comparing graphs…</> : <><Play className="h-4 w-4" /> Simulate change</>}
          </button>

          {result && <section className="mt-8 space-y-5" aria-live="polite">
            <div className="flex flex-col gap-4 rounded-xl border border-cardBorder bg-cardSurface p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="text-xs font-bold uppercase tracking-wider text-muted">Decision</div><div className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${verdictStyle}`}>{result.verdict === "PASS" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{result.verdict}</div></div>
              <div className="text-left sm:text-right"><div className="text-xs text-muted">Risk change</div><div className={`font-mono text-3xl font-bold ${result.risk_delta > 0 ? "text-danger" : "text-emerald-400"}`}>{result.risk_delta > 0 ? "+" : ""}{result.risk_delta}</div></div>
            </div>
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]"><ScoreCard label="Before" data={result.current} accent="text-textMain" /><ArrowRight className="mx-auto hidden h-5 w-5 text-muted sm:block" /><ScoreCard label="After" data={result.proposed} accent={result.risk_delta > 0 ? "text-danger" : "text-emerald-400"} /></div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-cardBorder bg-cardSurface p-5"><h2 className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-danger" /> Newly introduced findings</h2><div className="mt-4 space-y-3">{result.introduced_findings.length === 0 ? <p className="text-sm text-muted">No new findings introduced.</p> : result.introduced_findings.map(item => <div key={`${item.code}-${item.id}`} className="rounded-lg border border-cardBorder bg-pageBg p-4"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-primary">{item.code}</span><span className={`text-[10px] font-bold ${item.severity === "CRITICAL" ? "text-danger" : "text-warning"}`}>{item.severity}</span></div><p className="mt-2 text-sm font-medium">{item.title}</p><p className="mt-2 break-all font-mono text-[10px] text-muted">{item.actions.join(", ")} → {item.resources.join(", ")}</p></div>)}</div></div>
              <div className="rounded-xl border border-cardBorder bg-cardSurface p-5"><h2 className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Resolved findings</h2><div className="mt-4 space-y-3">{result.resolved_findings.length === 0 ? <p className="text-sm text-muted">No existing findings resolved.</p> : result.resolved_findings.map(item => <div key={`${item.code}-${item.id}`} className="rounded-lg border border-cardBorder bg-pageBg p-4"><span className="font-mono text-xs text-emerald-400">{item.code}</span><p className="mt-2 text-sm font-medium">{item.title}</p></div>)}</div></div>
            </div>
          </section>}
        </div>
      </main>
    </div>
  );
}
