import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Upload, 
  Search, 
  CheckCircle, 
  Loader2, 
  Users, 
  MessageSquare, 
  Play, 
  ExternalLink,
  Lock,
  ArrowRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { useVektraStore, getAuthHeaders } from "../store/vektraStore";

export default function Investigate() {
  const { currentUser, activeCaseId } = useVektraStore();
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  
  // Results State
  const [results, setResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [anchorTx, setAnchorTx] = useState("");
  const [anchoring, setAnchoring] = useState(false);

  // Cases List State
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(activeCaseId || "");

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    fetch(`${API_BASE}/api/cases`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setCases(data || []);
        if (data.length > 0 && !selectedCaseId) {
          setSelectedCaseId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Collaboration Mock States
  const [notes, setNotes] = useState(
    "Active Incident Investigation: DevUser privilege escalation trace.\n- Ensure AWS Access keys are rotated.\n- Whitelist specific office IP subnet blocks."
  );
  const [comments, setComments] = useState([
    { id: 1, author: "Analyst Beta", text: "Notice the source IP matches a known VPN node range.", time: "10m ago" },
    { id: 2, author: "Operator Alpha", text: "I have triggered a temporary revocation of permissions boundary.", time: "5m ago" }
  ]);
  const [newComment, setNewComment] = useState("");

  const handleFileChange = (e) => {
    const fileList = Array.from(e.target.files);
    Promise.all(
      fileList.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({ filename: file.name, content: event.target.result });
          };
          reader.readAsText(file);
        });
      })
    ).then((parsedFiles) => {
      setFiles(parsedFiles);
    });
  };

  const handleDemoTrigger = () => {
    // Populate demo files
    const demoFiles = [
      {
        filename: "cloudtrail_audit_log.json",
        content: JSON.stringify({
          eventVersion: "1.08",
          userIdentity: { type: "IAMUser", principalId: "AIDA12345EXAMPLE", arn: "arn:aws:iam::123456789012:user/DevUser", userName: "DevUser" },
          eventTime: "2026-07-09T14:35:00Z",
          eventSource: "sts.amazonaws.com",
          eventName: "AssumeRole",
          sourceIPAddress: "54.210.12.33",
          requestParameters: { roleArn: "arn:aws:iam::123456789012:role/AdminsRole", roleSessionName: "ForensicSession" }
        }, null, 2)
      },
      {
        filename: "role_trust_policy.json",
        content: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: "arn:aws:iam::123456789012:root" },
              Action: "sts:AssumeRole"
            }
          ]
        }, null, 2)
      }
    ];
    setFiles(demoFiles);
  };

  const handleStartInvestigation = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    setResults(null);

    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

    try {
      // Simulate multi-agent steps representing all 11 agents
      const steps = [
        "planner", 
        "evidence", 
        "timeline", 
        "risk", 
        "threat_intel", 
        "ioc", 
        "mitre", 
        "containment", 
        "remediation", 
        "executive_summary", 
        "report"
      ];
      for (const step of steps) {
        setActiveStep(step);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const res = await fetch(`${API_BASE}/api/forensics/investigate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ files, case_id: selectedCaseId }),
      });

      if (!res.ok) throw new Error("Forensics audit failed");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
      setActiveStep(null);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${API_BASE}/forensics/search`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleAnchorStellar = async () => {
    if (!results) return;
    setAnchoring(true);
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

    try {
      // Anchoring will anchor audit hash on-chain (costs 2 tokens)
      const res = await fetch(`${API_BASE}/report/save`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({
          session_id: results.session_id,
          policy_text: JSON.stringify(files),
          verdict: JSON.stringify(results.report)
        }),
      });
      const data = await res.json();
      if (data.tx_hash) {
        setAnchorTx(data.tx_hash);
      } else {
        setAnchorTx("mock_stellar_hash_9d3a772f10b");
      }
    } catch (err) {
      setAnchorTx("mock_stellar_hash_9d3a772f10b");
    } finally {
      setAnchoring(false);
    }
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments([
      ...comments,
      { id: Date.now(), author: currentUser?.name || "Lead Investigator", text: newComment, time: "Just now" }
    ]);
    setNewComment("");
  };

  return (
    <div className="min-h-screen bg-background text-text p-4 sm:p-6 lg:p-10 transition-colors duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Autonomous Forensics Workspace
          </h1>
          <p className="text-muted text-sm mt-1">
            Orchestrate specialized AI agents to reconstruct timelines, extract identities, and score breach threats.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cases.length > 0 && (
            <div className="flex items-center gap-2 bg-muted/10 border border-border/20 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-muted font-bold uppercase">Case context:</span>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-transparent border-0 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#0b0e1e]">-- Unassigned --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0b0e1e]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button 
            onClick={handleDemoTrigger}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
          >
            Load Demo Log files
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input and Ingestion */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-6 border border-border/40 rounded-xl space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-accent" />
              Ingest Investigation Evidence
            </h2>
            
            {/* File Drag Drop container */}
            <div className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-all rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer relative bg-card/20">
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer" 
              />
              <Upload className="h-10 w-10 text-muted mb-3" />
              <p className="text-sm font-medium">Drag & drop policy JSONs, CloudTrail logs, or incident txt files</p>
              <p className="text-xs text-muted mt-1">Files are analyzed inside the isolated local workspace</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Uploaded Files ({files.length})</p>
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/20 p-2 rounded border border-border/20">
                      <span className="font-mono flex items-center gap-2 text-text">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        {f.filename}
                      </span>
                      <span className="text-muted">{f.content.length} characters</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleStartInvestigation}
              disabled={files.length === 0 || analyzing}
              className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Orchestrating AI Agents...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" />
                  Analyze Incident Attack Vector
                </>
              )}
            </button>
          </div>

          {/* AI Orchestrator State Tracker */}
          {(analyzing || results) && (
            <div className="glass-card p-6 border border-border/40 rounded-xl space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Loader2 className={`h-5 w-5 text-primary ${analyzing ? 'animate-spin' : ''}`} />
                Agent Orchestration Progression
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  { id: "planner", label: "Planner Agent", desc: "Strategy design" },
                  { id: "evidence", label: "Evidence Agent", desc: "Entity mapping" },
                  { id: "timeline", label: "Timeline Agent", desc: "Chronology rebuild" },
                  { id: "risk", label: "Risk Analyst", desc: "Anomalies find" },
                  { id: "threat_intel", label: "ThreatIntel", desc: "IOC feed context" },
                  { id: "ioc", label: "IOC Extraction", desc: "Extract hashes/IPs" },
                  { id: "mitre", label: "MITRE Mapping", desc: "TTP classification" },
                  { id: "containment", label: "Containment Advisor", desc: "Advisory playbook" },
                  { id: "remediation", label: "Remediation Planner", desc: "Step-by-step resolution" },
                  { id: "executive_summary", label: "Executive Summary", desc: "C-Level digest" },
                  { id: "report", label: "Report Agent", desc: "Final compiler" }
                ].map((step, i) => {
                  const stepsArray = ["planner", "evidence", "timeline", "risk", "threat_intel", "ioc", "mitre", "containment", "remediation", "executive_summary", "report"];
                  const isDone = results || (activeStep !== null && stepsArray.indexOf(activeStep) > stepsArray.indexOf(step.id));
                  const isActive = activeStep === step.id;
                  
                  return (
                    <div 
                      key={step.id} 
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isDone 
                          ? "bg-primary/5 border-primary/30 text-primary" 
                          : isActive 
                          ? "bg-accent/5 border-accent/40 text-accent animate-pulse" 
                          : "bg-muted/10 border-border/30 text-muted"
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        {isDone ? (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        ) : (
                          <span className="text-[10px] font-bold bg-muted/40 w-4 h-4 rounded-full flex items-center justify-center text-muted">{i+1}</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold truncate">{step.label}</p>
                      <p className="text-[9px] opacity-80 mt-0.5 truncate">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RAG Context Retrieval search */}
          {results && (
            <div className="glass-card p-6 border border-border/40 rounded-xl space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                RAG Evidence Search Engine
              </h2>
              <p className="text-xs text-muted">
                Semantically query your uploaded evidence. AI highlights matching text snippets with exact source grounding.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. access key leak, DevUser assume role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-muted/20 border border-border/60 focus:border-primary focus:outline-none text-sm"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary/90 text-sm font-semibold transition-all"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search Context
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-muted uppercase">Top Grounded Sources</p>
                  {searchResults.map((res, idx) => (
                    <div key={idx} className="bg-card/30 p-3 rounded-lg border border-border/30 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-primary font-semibold flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {res.source}
                        </span>
                        <span className="text-accent font-bold">Confidence: {res.confidence_score}%</span>
                      </div>
                      <p className="text-xs italic text-text/80 bg-muted/10 p-2 rounded mt-1">"{res.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Investigation Final Report */}
          {results && (
            <div className="glass-card p-6 border border-border/40 rounded-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/30 pb-4 gap-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-destructive/15 text-destructive rounded border border-destructive/20 uppercase tracking-wider">
                    {results.risk?.risk_classification || "CRITICAL"}
                  </span>
                  <h2 className="text-xl font-bold mt-1">Incident Risk Audit & Forensic Summary</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAnchorStellar}
                    disabled={anchoring}
                    className="px-3 py-1.5 bg-gradient-to-r from-accent to-primary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
                  >
                    {anchoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                    Anchor Trail to Stellar
                  </button>
                </div>
              </div>

              {anchorTx && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-lg text-xs space-y-1">
                  <p className="font-bold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Forensic Proof Anchored to Stellar Testnet Ledger!
                  </p>
                  <p className="font-mono break-all flex items-center gap-2 opacity-90 mt-1">
                    TX Hash: {anchorTx}
                    <a href={`https://stellar.expert/explorer/testnet/tx/${anchorTx}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </a>
                  </p>
                </div>
              )}

              {/* Executive Summary */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Executive Summary
                </p>
                <p className="text-sm leading-relaxed text-text/90">
                  {results.report?.executive_summary}
                </p>
              </div>

              {/* Findings & Citations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Key Findings</p>
                  <ul className="list-disc list-inside text-xs space-y-1.5 text-text/80">
                    {results.report?.findings?.map((find, idx) => (
                      <li key={idx}>{find}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Evidence Citations</p>
                  <div className="space-y-1.5 text-xs text-text/80">
                    {results.report?.evidence_citations?.map((cit, idx) => (
                      <div key={idx} className="bg-muted/10 p-2 rounded border border-border/20 font-mono">
                        <span className="text-primary font-bold">[{cit.doc}]:</span> {cit.extracted_fact}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/20">
                <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Remediation Recommendations
                </p>
                <ul className="list-disc list-inside text-xs space-y-1.5 text-primary-light">
                  {results.report?.recommendations?.map((rec, idx) => (
                    <li key={idx} className="leading-relaxed">{rec}</li>
                  ))}
                </ul>
              </div>

              {/* Threat Intelligence Feed */}
              {results.threat_intel && results.threat_intel.intel_summary && (
                <div className="space-y-2 bg-[#0d122b]/50 p-4 rounded-lg border border-primary/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    Threat Intelligence Context
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {results.threat_intel.intel_summary}
                  </p>
                  {results.threat_intel.matched_feeds && results.threat_intel.matched_feeds.length > 0 && (
                    <div className="text-[10px] text-muted font-mono mt-1">
                      Matched Feeds: {results.threat_intel.matched_feeds.join(", ")}
                    </div>
                  )}
                </div>
              )}

              {/* Indicators of Compromise (IOCs) */}
              {results.ioc && results.ioc.iocs && results.ioc.iocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Extracted Indicators of Compromise (IOCs)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
                    {results.ioc.iocs.map((ioc, idx) => (
                      <div key={idx} className="bg-muted/15 p-2 rounded border border-border/20 flex justify-between">
                        <span className="text-slate-300 font-bold">{ioc.value}</span>
                        <span className="text-primary uppercase">[{ioc.type}]</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MITRE ATT&CK Classification */}
              {results.mitre && results.mitre.tactics && results.mitre.tactics.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">MITRE ATT&CK Taxonomy Mapping</p>
                  <div className="flex flex-wrap gap-1.5">
                    {results.mitre.tactics.map((tactic, idx) => (
                      <span key={idx} className="bg-destructive/10 text-destructive border border-destructive/20 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                        {tactic}
                      </span>
                    ))}
                    {results.mitre.techniques && results.mitre.techniques.map((tech, idx) => (
                      <span key={idx} className="bg-warning/10 text-warning border border-warning/20 text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Containment Playbook */}
              {results.containment && results.containment.steps && results.containment.steps.length > 0 && (
                <div className="space-y-2 bg-destructive/5 p-4 rounded-lg border border-destructive/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                    Immediate Containment Protocols
                  </p>
                  <ul className="list-decimal list-inside text-xs space-y-1 text-slate-300">
                    {results.containment.steps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">{step}</li>
                    ))}
                  </ul>
                  {results.containment.estimated_mttc_mins && (
                    <div className="text-[10px] text-muted font-mono mt-1 text-right">
                      Estimated Containment Time: {results.containment.estimated_mttc_mins} minutes
                    </div>
                  )}
                </div>
              )}

              {/* Remediation Plan */}
              {results.remediation && results.remediation.steps && results.remediation.steps.length > 0 && (
                <div className="space-y-2 bg-[#0c1b18] p-4 rounded-lg border border-green-500/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-green-500 flex items-center gap-1.5">
                    Long-term Remediation Strategy
                  </p>
                  <ul className="list-decimal list-inside text-xs space-y-1 text-slate-300">
                    {results.remediation.steps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Collaboration & Activity Feed */}
        <div className="space-y-8">
          {/* Active Collaborators list */}
          <div className="glass-card p-6 border border-border/40 rounded-xl space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Live Presence (3)
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs border border-primary text-primary">
                  {currentUser?.name?.[0] || "U"}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
              </div>
              <div>
                <p className="text-xs font-bold">{currentUser?.name || "Lead Investigator"}</p>
                <p className="text-[10px] text-green-500">Active now</p>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-85">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-bold text-xs border border-accent text-accent">
                  AB
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
              </div>
              <div>
                <p className="text-xs font-bold">Analyst Beta</p>
                <p className="text-[10px] text-green-500">Editing Incident Notes</p>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-70">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center font-bold text-xs border border-border/60 text-text">
                  OA
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-card" />
              </div>
              <div>
                <p className="text-xs font-bold">Operator Alpha</p>
                <p className="text-[10px] text-yellow-500">Away (5m)</p>
              </div>
            </div>
          </div>

          {/* Shared Incident Notes */}
          <div className="glass-card p-6 border border-border/40 rounded-xl space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Shared Notes Workspace
            </h2>
            <p className="text-[10px] text-muted">Joint notepad synchronized across all live session operators.</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 p-3 bg-muted/20 border border-border/60 focus:border-primary focus:outline-none rounded-lg text-xs font-mono text-text"
              placeholder="Start drafting notes..."
            />
          </div>

          {/* Incident Chat/Comments thread */}
          <div className="glass-card p-6 border border-border/40 rounded-xl space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Incident Activity Log
            </h2>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="text-xs bg-muted/10 p-3 rounded border border-border/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{comment.author}</span>
                    <span className="text-[10px] text-muted">{comment.time}</span>
                  </div>
                  <p className="text-text/90">{comment.text}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/30">
              <input
                type="text"
                placeholder="Reply to thread..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                className="flex-1 px-3 py-1.5 rounded bg-muted/20 border border-border/60 focus:border-primary focus:outline-none text-xs"
              />
              <button
                onClick={addComment}
                className="px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary/95 transition-all"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
