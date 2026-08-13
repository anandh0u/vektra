import React from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Bot, BrainCircuit, CheckCircle2, Cloud, Database, FlaskConical, GitBranch, LockKeyhole, Network, Radar, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useVektraStore } from "../store/vektraStore";

const modules = [
  { phase: 0, title: "Secure foundation", description: "Authentication, protected delivery, security headers, tenant-aware cases, and audited CI.", icon: LockKeyhole, status: "operational", href: "/settings" },
  { phase: 1, title: "Threat memory", description: "Neo4j-backed relationships, evidence provenance, forensic entities, and persistent scan context.", icon: Database, status: "active", href: "/twin" },
  { phase: 2, title: "Threat intelligence", description: "Source-ranked threat context and threat-arrival matching against mapped exposure.", icon: Radar, status: "building", href: "/twin" },
  { phase: 3, title: "Evidence fabric", description: "Case evidence, hashes, forensic ingestion, RAG retrieval, and chain-of-custody context.", icon: Cloud, status: "active", href: "/investigate" },
  { phase: 4, title: "Attack-path reasoning", description: "IAM and RBAC graphs, fourteen finding classes, correlation, risk, and blast-radius views.", icon: GitBranch, status: "operational", href: "/analyze" },
  { phase: 5, title: "Expert agent mesh", description: "Planner, forensics, conflict, verifier, risk, remediation, and executive specialist roles.", icon: Bot, status: "active", href: "/chatbot" },
  { phase: 6, title: "Artifact analysis", description: "Controlled forensic file ingestion and multi-agent artifact investigation workflows.", icon: FlaskConical, status: "building", href: "/investigate" },
  { phase: 7, title: "Controlled learning", description: "Versioned evidence retrieval and analyst feedback without silent production retraining.", icon: BrainCircuit, status: "foundation", href: "/timeline" },
  { phase: 8, title: "Enterprise workflows", description: "Cases, assignments, evidence, comments, activity, reports, accounts, and compliance views.", icon: Workflow, status: "active", href: "/cases" },
  { phase: 9, title: "Safe response", description: "Policy change simulation, introduced-finding checks, approval-first recommendations, and rollback intent.", icon: ShieldCheck, status: "active", href: "/simulator" },
  { phase: 10, title: "Trust and resilience", description: "CodeQL, secret scanning, dependency audit, security headers, runbooks, and release gates.", icon: CheckCircle2, status: "operational", href: "/compliance" },
  { phase: 11, title: "Research network", description: "A future global defensive research and validated-intelligence collaboration layer.", icon: Network, status: "planned", href: "/twin" },
];

const statusStyle = {
  operational: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
  active: "border-primary/20 bg-primary/10 text-primary",
  building: "border-warning/20 bg-warning/10 text-warning",
  foundation: "border-violet-400/20 bg-violet-400/10 text-violet-400",
  planned: "border-cardBorder bg-bgElevated text-muted",
};

export default function PlatformPage() {
  const { nodes, conflicts, currentUser } = useVektraStore();
  const built = modules.filter(module => ["operational", "active"].includes(module.status)).length;
  return <div className="flex min-h-screen bg-pageBg text-textMain"><Sidebar /><div className="min-w-0 flex-1"><TopBar /><main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="vektra-surface relative overflow-hidden p-6 sm:p-8"><div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" /><div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary"><Sparkles className="h-4 w-4" /> VEKTRA platform</div><h1 className="mt-3 max-w-3xl text-3xl font-bold sm:text-4xl">One intelligence system. Twelve disciplined capability layers.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted">This control center connects what already works, what is actively being strengthened, and what remains gated by security, evidence, and reliability requirements.</p></div><div className="grid grid-cols-3 gap-2"><div className="rounded-xl border border-cardBorder bg-pageBg/40 p-3 text-center"><strong className="block text-xl">{built}</strong><span className="text-[8px] uppercase text-muted">Live layers</span></div><div className="rounded-xl border border-cardBorder bg-pageBg/40 p-3 text-center"><strong className="block text-xl">{nodes.length}</strong><span className="text-[8px] uppercase text-muted">Entities</span></div><div className="rounded-xl border border-cardBorder bg-pageBg/40 p-3 text-center"><strong className="block text-xl">{conflicts.length}</strong><span className="text-[8px] uppercase text-muted">Findings</span></div></div></div></header>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{modules.map(module => { const Icon = module.icon; return <Link key={module.phase} to={module.href} className="vektra-surface group p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><span className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${statusStyle[module.status]}`}>{module.status}</span></div><div className="mt-5 text-[9px] font-bold uppercase tracking-[.18em] text-muted">Phase {module.phase}</div><h2 className="mt-1 text-base font-bold">{module.title}</h2><p className="mt-2 min-h-12 text-[11px] leading-5 text-muted">{module.description}</p><div className="mt-4 flex items-center justify-between border-t border-cardBorder pt-3 text-[10px] font-bold text-primary"><span>Open capability</span><ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div></Link>; })}</div>
    <section className="grid gap-3 lg:grid-cols-3"><div className="vektra-surface p-5"><Activity className="h-5 w-5 text-emerald-400" /><h3 className="mt-3 text-sm font-bold">Evidence before claims</h3><p className="mt-2 text-[11px] leading-5 text-muted">Every critical conclusion should remain reproducible from attributable evidence.</p></div><div className="vektra-surface p-5"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="mt-3 text-sm font-bold">Human-governed action</h3><p className="mt-2 text-[11px] leading-5 text-muted">High-impact execution remains permissioned, inspectable, reversible, and auditable.</p></div><div className="vektra-surface p-5"><Database className="h-5 w-5 text-violet-400" /><h3 className="mt-3 text-sm font-bold">Controlled memory</h3><p className="mt-2 text-[11px] leading-5 text-muted">Customer context improves retrieval without mixing tenants or silently retraining on raw data.</p></div></section>
    {!currentUser && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted">Sign in to connect cases, evidence, and saved organizational context to the platform view.</div>}
  </main></div></div>;
}
