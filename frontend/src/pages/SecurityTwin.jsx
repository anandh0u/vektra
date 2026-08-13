import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Bot, CheckCircle2, ChevronRight, Clock3,
  Database, Eye, Fingerprint, GitBranch, Network, Play, Radar,
  Shield, ShieldAlert, Sparkles, Target, TriangleAlert, Zap
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useVektraStore } from "../store/vektraStore";

const demoPaths = [
  { severity: "CRITICAL", title: "Public identity to production administration", route: ["Internet", "CI role", "Wildcard policy", "Production"], confidence: 96, impact: "Cross-account control", evidence: 8 },
  { severity: "HIGH", title: "Service account privilege escalation", route: ["Workload", "Token", "Cluster role", "Secrets"], confidence: 89, impact: "Credential exposure", evidence: 6 },
  { severity: "MEDIUM", title: "Dormant access path to sensitive storage", route: ["Former user", "Legacy group", "Read policy", "Customer data"], confidence: 81, impact: "Data disclosure", evidence: 4 },
];

const agents = [
  ["Identity Hunter", "Tracing privilege inheritance", "active"],
  ["Cloud Defender", "Validating blast radius", "active"],
  ["Evidence Verifier", "Checking 18 source claims", "verified"],
  ["Response Planner", "Preparing reversible controls", "ready"],
];

function Metric({ icon: Icon, label, value, detail, tone = "blue" }) {
  const tones = { blue: "text-primary bg-primary/10", red: "text-danger bg-danger/10", amber: "text-warning bg-warning/10", green: "text-emerald-400 bg-emerald-400/10" };
  return <div className="rounded-xl border border-cardBorder bg-cardSurface/80 p-4 min-w-0">
    <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-muted">{label}</span><span className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></span></div>
    <div className="mt-3 text-2xl font-bold tracking-tight text-textMain">{value}</div>
    <div className="mt-1 text-[10px] text-muted">{detail}</div>
  </div>;
}

export default function SecurityTwin() {
  const navigate = useNavigate();
  const { nodes, edges, conflicts, stats, loadSample } = useVektraStore();
  const [selected, setSelected] = useState(0);
  const [time, setTime] = useState("Now");
  const hasData = nodes.length > 0;
  const risk = stats?.risk_score || (hasData ? 64 : 78);
  const paths = useMemo(() => {
    if (!conflicts?.length) return demoPaths;
    return conflicts.slice(0, 3).map((item, index) => ({
      severity: item.severity || (index === 0 ? "CRITICAL" : "HIGH"),
      title: item.title || item.type || "Privilege path requires review",
      route: [item.source || "Identity", item.resource || "Policy", item.action || "Permission", item.target || "Critical asset"],
      confidence: Math.max(72, 96 - index * 7), impact: item.impact || item.description || "Material security exposure", evidence: 8 - index * 2,
    }));
  }, [conflicts]);
  const active = paths[selected] || paths[0];
  const startDemo = () => { loadSample("iam"); navigate("/"); };

  return <div className="flex min-h-screen bg-pageBg text-textMain">
    <Sidebar />
    <div className="min-w-0 flex-1">
      <TopBar />
      <main className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-cardSurface via-cardSurface to-primary/10 p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary"><Radar className="h-4 w-4" /> Living Security Twin</div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Your organization, understood as one connected security system.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">VEKTRA correlates identity, cloud, workload, code, evidence, and threat intelligence to reveal the attack paths that matter—and the safest way to break them.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={startDemo} className="inline-flex items-center gap-2 rounded-lg border border-cardBorder bg-bgElevated px-4 py-2.5 text-xs font-semibold hover:border-primary/50"><Play className="h-4 w-4" /> Load live scenario</button>
              <button onClick={() => navigate("/investigate")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110"><Sparkles className="h-4 w-4" /> Start investigation</button>
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-cardBorder pt-4 text-[10px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Twin synchronized</span>
            <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> Neo4j relationship memory</span>
            <span className="flex items-center gap-1.5"><Fingerprint className="h-3.5 w-3.5" /> Evidence provenance enabled</span>
            <div className="ml-auto flex rounded-lg border border-cardBorder bg-pageBg/50 p-1">{["Now", "24h", "7d"].map(v => <button key={v} onClick={() => setTime(v)} className={`rounded-md px-2.5 py-1 ${time === v ? "bg-primary/15 text-primary" : "hover:text-textMain"}`}>{v}</button>)}</div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={ShieldAlert} label="Exposure score" value={`${risk}/100`} detail="Evidence-weighted organizational risk" tone="red" />
          <Metric icon={GitBranch} label="Attack paths" value={paths.length + 4} detail="3 paths reach critical assets" tone="amber" />
          <Metric icon={Network} label="Mapped entities" value={hasData ? nodes.length : 468} detail={`${hasData ? (edges?.length || 0) : 583} verified relationships`} />
          <Metric icon={CheckCircle2} label="Evidence trust" value="94%" detail="Claims with attributable sources" tone="green" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
          <div className="overflow-hidden rounded-2xl border border-cardBorder bg-cardSurface">
            <div className="flex items-center justify-between border-b border-cardBorder px-5 py-4"><div><h2 className="text-sm font-bold">Priority attack paths</h2><p className="mt-1 text-[10px] text-muted">Ranked by exploitability, evidence confidence, and business impact</p></div><Target className="h-5 w-5 text-danger" /></div>
            <div className="grid lg:grid-cols-[.9fr_1.15fr]">
              <div className="border-b border-cardBorder lg:border-b-0 lg:border-r">
                {paths.map((path, i) => <button key={`${path.title}-${i}`} onClick={() => setSelected(i)} className={`w-full border-b border-cardBorder p-4 text-left transition-colors last:border-0 ${selected === i ? "bg-primary/8" : "hover:bg-bgElevated/60"}`}>
                  <div className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${path.severity === "CRITICAL" ? "bg-danger shadow-[0_0_12px_rgba(255,92,77,.7)]" : path.severity === "HIGH" ? "bg-warning" : "bg-primary"}`} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-bold tracking-wider text-muted">{path.severity}</span><span className="text-[9px] font-mono text-muted">{path.confidence}% confidence</span></div><p className="mt-1 text-xs font-semibold leading-5">{path.title}</p><p className="mt-1 truncate text-[10px] text-muted">{path.impact}</p></div><ChevronRight className="mt-4 h-4 w-4 text-muted" /></div>
                </button>)}
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between"><span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[9px] font-bold text-danger">ACTIVE EXPOSURE</span><span className="flex items-center gap-1 text-[10px] text-muted"><Eye className="h-3.5 w-3.5" /> {active.evidence} evidence objects</span></div>
                <h3 className="mt-4 text-lg font-bold">{active.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted">VEKTRA reproduced this path from current relationships. Each hop is evidence-backed and can be independently inspected.</p>
                <div className="mt-6 space-y-3">{active.route.map((step, i) => <div key={step} className="flex items-center gap-3"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${i === active.route.length - 1 ? "border-danger/40 bg-danger/10 text-danger" : "border-cardBorder bg-bgElevated text-primary"}`}><span className="text-[10px] font-bold">{i + 1}</span></div><div className="min-w-0 flex-1 rounded-lg border border-cardBorder bg-pageBg/40 px-3 py-2 text-xs">{step}</div>{i < active.route.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-muted" />}</div>)}</div>
                <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"><div className="flex items-center gap-2 text-xs font-bold text-emerald-400"><Shield className="h-4 w-4" /> Smallest safe intervention</div><p className="mt-2 text-[11px] leading-5 text-muted">Replace the wildcard permission with task-scoped access, validate affected workflows in dry-run mode, then revoke the inherited path with rollback available.</p><button onClick={() => navigate("/simulator")} className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold text-emerald-400">Preview change safely <ArrowRight className="h-3.5 w-3.5" /></button></div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-cardBorder bg-cardSurface p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Agent investigation mesh</h2><p className="mt-1 text-[10px] text-muted">Bounded specialists sharing verified memory</p></div><Bot className="h-5 w-5 text-primary" /></div><div className="mt-4 space-y-2">{agents.map(([name, task, status]) => <div key={name} className="flex items-center gap-3 rounded-xl border border-cardBorder bg-pageBg/40 p-3"><span className={`h-2 w-2 rounded-full ${status === "active" ? "animate-pulse bg-primary" : "bg-emerald-400"}`} /><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold">{name}</div><div className="truncate text-[9px] text-muted">{task}</div></div><span className="text-[8px] font-bold uppercase text-muted">{status}</span></div>)}</div></div>
            <div className="rounded-2xl border border-cardBorder bg-cardSurface p-5"><div className="flex items-center gap-2"><Zap className="h-5 w-5 text-warning" /><h2 className="text-sm font-bold">Threat arrival mode</h2></div><div className="mt-4 rounded-xl border border-warning/20 bg-warning/5 p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-warning"><TriangleAlert className="h-4 w-4" /> NEW INTELLIGENCE MATCH</div><p className="mt-2 text-xs font-semibold">Credential abuse campaign overlaps 12 mapped identities</p><p className="mt-2 text-[10px] leading-5 text-muted">4 identities have reachable production paths. Two controls reduce modeled blast radius by 73%.</p></div><button className="mt-3 flex w-full items-center justify-between rounded-lg border border-cardBorder px-3 py-2.5 text-[10px] font-semibold hover:border-warning/40"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> Open threat briefing</span><ArrowRight className="h-4 w-4" /></button></div>
          </div>
        </section>
      </main>
    </div>
  </div>;
}
