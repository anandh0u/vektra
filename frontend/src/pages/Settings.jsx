import React, { useState, useEffect, useCallback } from "react";
import { useVektraStore } from "../store/vektraStore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { Settings, Key, Database, RefreshCw, Trash2, ShieldCheck, Sparkles } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";
const PLACEHOLDER_MARKERS = ["your-", "xxxxxxxx", "example", "placeholder", "-here"];

const hasUsableLocalKey = (value) => {
  const cleaned = (value || "").trim().toLowerCase();
  return Boolean(cleaned) && !PLACEHOLDER_MARKERS.some((marker) => cleaned.includes(marker));
};

export default function SettingsPage() {
  const { 
    apiKey, 
    setApiKey, 
    clearRecentAnalyses,
    sessionId,
    resetSession
  } = useVektraStore();

  const [inputKey, setInputKey] = useState(apiKey);
  const [neo4jUri, setNeo4jUri] = useState(localStorage.getItem("vektra_neo4j_uri") || "");
  const [neo4jUsername, setNeo4jUsername] = useState(localStorage.getItem("vektra_neo4j_username") || "neo4j");
  const [neo4jPassword, setNeo4jPassword] = useState(localStorage.getItem("vektra_neo4j_password") || "");
  const [dbStatus, setDbStatus] = useState("checking"); // "checking" | "connected" | "offline"
  const [sarvamStatus, setSarvamStatus] = useState("checking"); // "checking" | "connected" | "offline"
  const [testingConnection, setTestingConnection] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [neo4jSaveSuccess, setNeo4jSaveSuccess] = useState(false);

  const checkDbConnection = useCallback(async (overrideKey) => {
    setTestingConnection(true);
    try {
      const savedKey = (overrideKey ?? apiKey ?? "").trim();
      const res = await fetch(`${API}/api/health`, {
        headers: hasUsableLocalKey(savedKey) ? { "X-Sarvam-API-Key": savedKey } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data.neo4j ? "connected" : "offline");
        setSarvamStatus(data.sarvam ? "connected" : "offline");
      } else {
        setDbStatus("offline");
        setSarvamStatus("offline");
      }
    } catch {
      setDbStatus("offline");
      setSarvamStatus("offline");
    } finally {
      setTestingConnection(false);
    }
  }, [apiKey]);

  useEffect(() => {
    checkDbConnection();
  }, [checkDbConnection, sessionId]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    setApiKey(inputKey);
    setSaveSuccess(true);
    setSarvamStatus(hasUsableLocalKey(inputKey) ? "connected" : "offline");
    void checkDbConnection(inputKey);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveNeo4j = (e) => {
    e.preventDefault();
    localStorage.setItem("vektra_neo4j_uri", neo4jUri);
    localStorage.setItem("vektra_neo4j_username", neo4jUsername);
    localStorage.setItem("vektra_neo4j_password", neo4jPassword);
    setNeo4jSaveSuccess(true);
    setTimeout(() => setNeo4jSaveSuccess(false), 2500);
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to delete all cached session history?")) {
      clearRecentAnalyses();
      resetSession();
      alert("Local session history cleared successfully.");
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        
        {/* TopBar */}
        <TopBar />

        {/* Settings Area */}
        <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full space-y-6">
          
          <div>
            <h2 className="font-heading font-bold text-2xl flex items-center gap-2 text-slate-100">
              <Settings className="w-6 h-6 text-primary" />
              Settings
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Manage your connection credentials and state storage options.
            </p>
          </div>

          <div className="space-y-6">
            
            {/* API key section */}
            <div className="bg-cardSurface border border-cardBorder rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-100 border-b border-[#1e2240] pb-3">
                <Key className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-sm">
                  Sarvam API Credentials
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                VEKTRA uses `sarvam-m` to evaluate vulnerabilities and draft remediations. Enter your Sarvam API key below (saved locally in your browser's <code className="text-primary font-mono bg-pageBg px-1 rounded">localStorage</code>).
              </p>
              
              <form onSubmit={handleSaveKey} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Enter your SARVAM_API_KEY..."
                    className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200 font-mono"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs font-semibold transition-all duration-200"
                  >
                    Save API Key
                  </button>
                  {saveSuccess && (
                    <span className="text-[10px] font-semibold text-safe flex items-center gap-1">
                      <ShieldCheck className="w-4.5 h-4.5" />
                      Saved to localStorage
                    </span>
                  )}
                </div>
              </form>

              <div className="flex items-center gap-3 bg-[#0d0f1a] border border-[#1e2240] p-4 rounded-xl">
                <div className={`w-3.5 h-3.5 rounded-full ${
                  sarvamStatus === "connected"
                    ? "bg-safe shadow-[0_0_12px_#10b981]"
                    : (sarvamStatus === "checking" ? "bg-muted/40 animate-pulse" : "bg-danger shadow-[0_0_12px_#ef4444]")
                }`} />
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {sarvamStatus === "connected" && "Sarvam Key Configured"}
                    {sarvamStatus === "offline" && "Sarvam Key Missing"}
                    {sarvamStatus === "checking" && "Checking Sarvam key..."}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {sarvamStatus === "connected" && "Analyses and chat requests will include the saved browser key."}
                    {sarvamStatus === "offline" && "Save a real SARVAM_API_KEY here or set it as a production environment variable."}
                    {sarvamStatus === "checking" && "Reading health metrics from the backend."}
                  </div>
                </div>
              </div>
            </div>

            {/* ── NEO4J CONNECTION STATUS ── */}
            <div className="bg-cardSurface border border-cardBorder rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e2240] pb-3">
                <div className="flex items-center gap-2 text-slate-100">
                  <Database className="w-5 h-5 text-secondary" />
                  <h3 className="font-heading font-semibold text-sm">
                    Neo4j AuraDB Service
                  </h3>
                </div>
                <button
                  onClick={checkDbConnection}
                  disabled={testingConnection}
                  className="p-1.5 hover:bg-[#1e2240] rounded transition-all text-muted hover:text-slate-200"
                  title="Refresh Connection"
                >
                  <RefreshCw className={`w-4 h-4 ${testingConnection ? "animate-spin text-secondary" : ""}`} />
                </button>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Connects to Neo4j to store VEKTRA relationship edges (`CONFLICTS_WITH`, `ESCALATES_TO`, `BYPASSES`, `EXPOSES`) and rule nodes.
              </p>

              <form onSubmit={handleSaveNeo4j} className="grid gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                    Neo4j URI
                  </label>
                  <input
                    type="password"
                    value={neo4jUri}
                    onChange={(e) => setNeo4jUri(e.target.value)}
                    placeholder="neo4j+s://xxxxxxxx.databases.neo4j.io"
                    className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-secondary transition-all duration-200 font-mono"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Username
                    </label>
                    <input
                      type="password"
                      value={neo4jUsername}
                      onChange={(e) => setNeo4jUsername(e.target.value)}
                      placeholder="neo4j"
                      className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-secondary transition-all duration-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Password
                    </label>
                    <input
                      type="password"
                      value={neo4jPassword}
                      onChange={(e) => setNeo4jPassword(e.target.value)}
                      placeholder="AuraDB password"
                      className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-secondary transition-all duration-200 font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-white rounded-lg text-xs font-semibold transition-all duration-200"
                  >
                    Save Neo4j Fields
                  </button>
                  {neo4jSaveSuccess && (
                    <span className="text-[10px] font-semibold text-safe flex items-center gap-1">
                      <ShieldCheck className="w-4.5 h-4.5" />
                      Saved locally
                    </span>
                  )}
                </div>
              </form>

              <div className="flex items-center gap-3 bg-[#0d0f1a] border border-[#1e2240] p-4 rounded-xl">
                <div className={`w-3.5 h-3.5 rounded-full ${
                  dbStatus === "connected" 
                    ? "bg-safe shadow-[0_0_12px_#10b981]" 
                    : (dbStatus === "checking" ? "bg-muted/40 animate-pulse" : "bg-danger shadow-[0_0_12px_#ef4444]")
                }`} />
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {dbStatus === "connected" && "AuraDB Connected"}
                    {dbStatus === "offline" && "Offline Mode (Local Engine)"}
                    {dbStatus === "checking" && "Connecting to AuraDB..."}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {dbStatus === "connected" && "Writing graph relationships correctly to Neo4j cloud."}
                    {dbStatus === "offline" && "Graph database offline. Verify your NEO4J_URI environment credentials."}
                    {dbStatus === "checking" && "Querying health metrics..."}
                  </div>
                </div>
              </div>
            </div>

            {/* ── DATA & CACHE MANAGEMENT ── */}
            <div className="bg-cardSurface border border-[#ef4444]/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-100 border-b border-[#1e2240] pb-3">
                <Trash2 className="w-5 h-5 text-danger" />
                <h3 className="font-heading font-semibold text-sm">
                  Clear Session Data
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Remove cached analyses and stored configurations from this browser. This does not modify files in your Neo4j database instance.
              </p>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 hover:border-danger/40 rounded-lg text-xs font-semibold transition-all duration-200"
              >
                Clear History & Reset
              </button>
            </div>

            {/* Credits Info */}
            <div className="text-center text-[10px] text-muted space-y-1 select-none pt-4">
              <div className="flex items-center justify-center gap-1 font-semibold text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>VEKTRA SECURITY v1.0.0</span>
              </div>
              <p>HACKHAZARDS '26 Hackathon Submission</p>
              <p>Built with React, FastAPI, Neo4j, and Sarvam AI agents</p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
