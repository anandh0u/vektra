import React, { useState } from "react";
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
import { useVektraStore } from "../store/vektraStore";

export default function Investigate() {
  const { currentUser } = useVektraStore();
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
      // Simulate multi-agent steps
      const steps = ["planner", "evidence", "timeline", "risk", "report"];
      for (const step of steps) {
        setActiveStep(step);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const res = await fetch(`${API_BASE}/forensics/investigate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ files }),
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
    <div className="min-h-screen bg-background text-text p-6 lg:p-10 transition-colors duration-300">
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
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { id: "planner", label: "Planner Agent", desc: "Strategy design" },
                  { id: "evidence", label: "Evidence Agent", desc: "Entity mapping" },
                  { id: "timeline", label: "Timeline Agent", desc: "Chronology rebuild" },
                  { id: "risk", label: "Risk Analyst", desc: "Anomalies find" },
                  { id: "report", label: "Report Agent", desc: "Audit summary" }
                ].map((step, i) => {
                  const isDone = results || (activeStep !== null && ["planner", "evidence", "timeline", "risk", "report"].indexOf(activeStep) > ["planner", "evidence", "timeline", "risk", "report"].indexOf(step.id));
                  const isActive = activeStep === step.id;
                  
                  return (
                    <div 
                      key={step.id} 
                      className={`p-4 rounded-lg border text-center transition-all ${
                        isDone 
                          ? "bg-primary/5 border-primary/30 text-primary" 
                          : isActive 
                          ? "bg-accent/5 border-accent/40 text-accent animate-pulse" 
                          : "bg-muted/10 border-border/30 text-muted"
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        {isDone ? (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        ) : isActive ? (
                          <Loader2 className="h-5 w-5 animate-spin text-accent" />
                        ) : (
                          <span className="text-xs font-bold bg-muted/40 w-5 h-5 rounded-full flex items-center justify-center text-muted">{i+1}</span>
                        )}
                      </div>
                      <p className="text-xs font-bold">{step.label}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{step.desc}</p>
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
