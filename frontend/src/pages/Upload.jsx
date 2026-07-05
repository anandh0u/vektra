import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import { Upload, FileCode, Play, Loader2, Sparkles, Network, Activity } from "lucide-react";
import AuthNav from "../components/AuthNav";

const HARDCODED_SAMPLE_IAM = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3PutObject",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::prod-bucket/*"]
    },
    {
      "Sid": "DenyS3PutObject",
      "Effect": "Deny",
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::prod-bucket/*"]
    },
    {
      "Sid": "AllowPolicyVersionEscalation",
      "Effect": "Allow",
      "Action": ["iam:CreatePolicyVersion"],
      "Resource": ["arn:aws:iam::111122223333:policy/AppPolicy"]
    },
    {
      "Sid": "AllowSensitiveDeleteWildcard",
      "Effect": "Allow",
      "Action": ["s3:DeleteBucket"],
      "Resource": ["*"]
    },
    {
      "Sid": "AllowAdminWildcard",
      "Effect": "Allow",
      "Action": ["*"],
      "Resource": ["*"]
    },
    {
      "Sid": "AllowS3WildcardSpecificBucket",
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::prod-bucket/*"]
    },
    {
      "Sid": "DenyGetObjectWithCondition",
      "Effect": "Deny",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::prod-bucket/*"],
      "Condition": {
        "NotIpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    },
    {
      "Sid": "DenyUnusedDynamoDelete",
      "Effect": "Deny",
      "Action": ["dynamodb:DeleteTable"],
      "Resource": ["arn:aws:dynamodb:us-east-1:111122223333:table/archive"]
    },
    {
      "Sid": "AllowTerminateInstances",
      "Effect": "Allow",
      "Action": ["ec2:TerminateInstances"],
      "Resource": ["*"]
    }
  ]
}`;

const HARDCODED_SAMPLE_K8S = `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: monitoring
  name: monitoring-readonly
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: monitoring
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-admin-binding
subjects:
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: platform-admin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: monitoring
  name: monitoring-readonly-binding
subjects:
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring
roleRef:
  kind: Role
  name: monitoring-readonly
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: monitoring
  name: secret-reader-binding
subjects:
- kind: User
  name: analyst
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io`;

export default function UploadPage() {
  const navigate = useNavigate();
  const { 
    policyText, 
    setPolicyText, 
    format, 
    setFormat, 
    runAnalysis, 
    isAnalyzing,
    currentUser,
    authNotice,
    setAuthNotice
  } = useVektraStore();

  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const tier = (currentUser?.tier || "free").toLowerCase();
  const credits = currentUser?.credits_balance ?? 0;
  const isFree = tier === "free";
  const agentsUnlocked = ["pro", "team"].includes(tier);

  // Clear policyText on mount
  useEffect(() => {
    setPolicyText("");
  }, [setPolicyText]);

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
    
    // Auto-detect format to avoid parsing errors
    const trimmed = policyText.trim();
    let detectedFormat = format;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      detectedFormat = "iam";
    } else if (trimmed.includes("apiVersion:") || trimmed.includes("kind:") || trimmed.includes("rules:")) {
      detectedFormat = "k8s";
    }
    
    if (detectedFormat !== format) {
      setFormat(detectedFormat);
    }

    try {
      await runAnalysis();
      navigate("/analyze");
    } catch (e) {
      setErrorMsg(e.message || "Failed to analyze policy. Please check syntax or backend logs.");
    }
  };

  const handleLoadSample = (sampleType) => {
    if (sampleType === "iam") {
      setFormat("iam");
      setPolicyText(HARDCODED_SAMPLE_IAM);
    } else {
      setFormat("k8s");
      setPolicyText(HARDCODED_SAMPLE_K8S);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f1a] flex flex-col justify-between select-none relative">
      
      {/* Credits Widget (Top Right of Page if Logged In) */}
      {currentUser && (
        <div className="fixed top-20 right-8 z-40 bg-[#141628] border border-primary/40 rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(124,58,237,0.2)] text-xs text-slate-200">
          You have <span className="text-primary font-bold">{credits} credits</span> · Full scan costs <span className="text-secondary font-bold">5</span>
        </div>
      )}

      {/* ── TOP NAV ── */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-[#1e2240] bg-[#0a0c16]/50 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-lg">
            <Network className="w-5 h-5 text-white" />
          </div>
          <span 
            onClick={() => currentUser ? navigate("/dashboard") : navigate("/")}
            className="font-heading font-bold text-xl tracking-wider bg-gradient-to-r from-white via-slate-200 to-secondary bg-clip-text text-transparent cursor-pointer"
          >
            VEKTRA
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleLoadSample("iam")}
            className="px-3 py-1.5 rounded-lg border border-[#1e2240] text-xs text-muted hover:text-slate-200 hover:bg-[#141628] transition-all duration-200"
          >
            Load Sample IAM
          </button>
          <button 
            onClick={() => handleLoadSample("k8s")}
            className="px-3 py-1.5 rounded-lg border border-[#1e2240] text-xs text-muted hover:text-slate-200 hover:bg-[#141628] transition-all duration-200"
          >
            Load Sample RBAC
          </button>
          <div className="ml-2">
            <AuthNav />
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl w-full mx-auto px-6 py-12 space-y-10 z-10">
        
        {/* Hero Area */}
        <div className="text-center space-y-4 max-w-2xl">
          {authNotice && (
            <button
              onClick={() => setAuthNotice("")}
              className="mx-auto block rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-xs font-semibold text-warning"
            >
              {authNotice}
            </button>
          )}
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

        {/* Warning Banner if Credits < 5 on Free tier */}
        {currentUser && isFree && credits < 5 && (
          <div className="w-full max-w-3xl border border-warning/45 bg-warning/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <span className="text-slate-200 font-semibold">
              ⚠️ You have {credits} credits. Full scan costs 5 credits. Basic scan costs 1 credit.
            </span>
            <Link to="/pricing" className="text-primary hover:underline font-bold shrink-0">
              Upgrade for 200 monthly credits →
            </Link>
          </div>
        )}

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
              
              {/* Live Syntax Status Badge */}
              <div className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 ${
                policyText.trim() ? "bg-safe/10 text-safe border border-safe/20" : "bg-[#141628] text-muted border border-[#1e2240]"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${policyText.trim() ? "bg-safe animate-pulse" : "bg-muted"}`} />
                <span>{policyText.trim() ? "Content loaded" : "Empty"}</span>
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
                <span>{agentsUnlocked ? "Analyze with AI agents" : "Analyze free graph"}</span>
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
            <span>AI agents unlocked on Pro</span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#1e2240]/40 flex items-center justify-center text-[10px] text-muted">
        VEKTRA • Trust, Identity & Security • Powered by Neo4j & Sarvam
      </footer>

    </div>
  );
}
