import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import { Upload, FileCode, Play, Loader2, Sparkles, Network, Activity } from "lucide-react";

export default function UploadPage() {
  const navigate = useNavigate();
  const { 
    policyText, 
    setPolicyText, 
    format, 
    setFormat, 
    runAnalysis, 
    isAnalyzing,
    loadSample
  } = useVektraStore();

  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();
    
    reader.onload = (event) => {
      const content = event.target.result;
      setPolicyText(content);
      
      // Auto-toggle format based on file extension
      if (fileName.endsWith(".json")) {
        setFormat("iam");
      } else if (fileName.endsWith(".yaml") || fileName.endsWith(".yml")) {
        setFormat("k8s");
      }
    };
    
    reader.readAsText(file);
  };

  const handleStartAnalysis = async () => {
    setErrorMsg("");
    try {
      await runAnalysis();
      navigate("/analyze");
    } catch (e) {
      setErrorMsg(e.message || "Failed to analyze policy. Please check syntax or backend logs.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f1a] flex flex-col justify-between select-none">
      
      {/* ── TOP NAV ── */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-[#1e2240] bg-[#0a0c16]/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-lg">
            <Network className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-xl tracking-wider bg-gradient-to-r from-white via-slate-200 to-secondary bg-clip-text text-transparent">
            VEKTRA
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => loadSample("iam")}
            className="px-3 py-1.5 rounded-lg border border-[#1e2240] text-xs text-muted hover:text-slate-200 hover:bg-[#141628] transition-all duration-200"
          >
            Load Sample IAM
          </button>
          <button 
            onClick={() => loadSample("k8s")}
            className="px-3 py-1.5 rounded-lg border border-[#1e2240] text-xs text-muted hover:text-slate-200 hover:bg-[#141628] transition-all duration-200"
          >
            Load Sample RBAC
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl w-full mx-auto px-6 py-12 space-y-10">
        
        {/* Hero Area */}
        <div className="text-center space-y-4 max-w-2xl">
          <h1 className="font-heading font-bold text-4xl md:text-5xl leading-tight text-white tracking-tight">
            Find the rules that <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              will break you.
            </span>
          </h1>
          <p className="text-sm md:text-base text-muted font-sans max-w-xl mx-auto leading-relaxed">
            Upload your AWS IAM or Kubernetes RBAC policy. VEKTRA maps every hidden vulnerability before it becomes a security incident.
          </p>
        </div>

        {/* Format Selector Pills */}
        <div className="flex bg-[#0a0c16] p-1 rounded-xl border border-[#1e2240]">
          <button
            onClick={() => setFormat("iam")}
            className={`px-6 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 ${
              format === "iam" 
                ? "bg-primary text-white shadow-md shadow-primary/20" 
                : "text-muted hover:text-slate-200"
            }`}
          >
            AWS IAM JSON
          </button>
          <button
            onClick={() => setFormat("k8s")}
            className={`px-6 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 ${
              format === "k8s" 
                ? "bg-primary text-white shadow-md shadow-primary/20" 
                : "text-muted hover:text-slate-200"
            }`}
          >
            KUBERNETES RBAC YAML
          </button>
        </div>

        {/* Input Zone Container */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[300px] ${
              dragActive 
                ? "border-primary bg-primary/5 scale-[0.99]" 
                : "border-[#1e2240] hover:border-primary/50 bg-[#141628]/40"
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".json,.yaml,.yml"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Drop JSON or YAML files here
                </p>
                <p className="text-xs text-muted mt-1.5">
                  or click to browse from files
                </p>
              </div>
              <div className="text-[10px] text-muted bg-[#0d0f1a] border border-[#1e2240] px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                {format === "iam" ? "JSON Format" : "YAML Format"}
              </div>
            </label>
          </div>

          {/* Text Editor Area */}
          <div className="flex flex-col border border-[#1e2240] rounded-2xl overflow-hidden bg-[#08080e] min-h-[300px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2240] bg-[#0a0c16]">
              <div className="flex items-center gap-2 text-muted">
                <FileCode className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
                  {format === "iam" ? "policy.json" : "rbac.yaml"}
                </span>
              </div>
            </div>
            <textarea
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
              className="flex-1 w-full bg-transparent p-4 text-xs font-mono text-slate-300 placeholder-muted focus:outline-none resize-none min-h-[220px]"
              placeholder={
                format === "iam" 
                  ? "Paste your AWS IAM JSON policy statement here..." 
                  : "Paste your Kubernetes Role & Binding YAML configs here..."
              }
            />
          </div>

        </div>

        {/* CTA Analyze Button */}
        <div className="w-full max-w-md flex flex-col gap-2">
          {errorMsg && (
            <div className="text-xs text-danger text-center bg-danger/10 border border-danger/20 py-2.5 px-4 rounded-xl">
              {errorMsg}
            </div>
          )}
          <button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || !policyText.trim()}
            className="w-full h-[52px] bg-gradient-to-r from-primary to-secondary text-white font-heading font-semibold text-sm rounded-xl hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Agents analyzing policy...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Analyze with VEKTRA →</span>
              </>
            )}
          </button>
        </div>

        {/* Stat badges under CTA */}
        <div className="flex flex-wrap justify-center gap-6 text-muted text-xs font-medium select-none pt-4">
          <div className="flex items-center gap-1.5 bg-[#141628]/40 border border-[#1e2240] px-4 py-2 rounded-full">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
            <span>Detects 14 vulnerability classes</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#141628]/40 border border-[#1e2240] px-4 py-2 rounded-full">
            <Activity className="w-4.5 h-4.5 text-secondary" />
            <span>Handles 500+ rule nodes</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#141628]/40 border border-[#1e2240] px-4 py-2 rounded-full">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
            <span>3 Sarvam AI agents on every analysis</span>
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
