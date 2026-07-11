import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import { Upload, FileCode, Play, Loader2, Sparkles, Network, Activity, ShieldAlert, Cpu, ArrowRight, Sun, Moon } from "lucide-react";
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

function SecurityGraphVisual() {
  return (
    <div className="w-full py-4 bg-cardSurface/30 border border-cardBorder rounded-[6px] overflow-hidden relative">
      <div className="absolute top-2.5 left-3.5 flex items-center gap-1.5 text-[8px] font-bold text-muted uppercase tracking-wider font-mono">
        <Activity className="w-3 h-3 text-primary" />
        <span>Access Relationship Map</span>
      </div>
      <svg className="w-full h-32 text-muted" viewBox="0 0 600 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M120 80 H 260" stroke="var(--border-hairline)" strokeWidth="1" strokeDasharray="4" className="animate-[flow-dash_2.5s_linear_infinite]" />
        <path d="M260 80 L 400 40" stroke="var(--border-hairline)" strokeWidth="1" strokeDasharray="4" className="animate-[flow-dash_2s_linear_infinite]" />
        <path d="M260 80 L 400 120" stroke="var(--border-hairline)" strokeWidth="1" />
        <path d="M400 40 H 530" stroke="var(--border-hairline)" strokeWidth="1" strokeDasharray="4" className="animate-[flow-dash_1.5s_linear_infinite]" />
        
        {/* Node 1: Identity */}
        <circle cx="120" cy="80" r="16" fill="var(--bg-base)" stroke="var(--border-hairline)" strokeWidth="1" />
        <text x="120" y="83" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="JetBrains Mono">User</text>
        
        {/* Node 2: Role */}
        <circle cx="260" cy="80" r="20" fill="var(--bg-surface)" stroke="var(--color-primary)" strokeWidth="1" />
        <text x="260" y="83" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="JetBrains Mono">Role</text>
        
        {/* Node 3: Escalate Policy */}
        <circle cx="400" cy="40" r="16" fill="var(--bg-surface)" stroke="var(--color-primary)" strokeWidth="1" />
        <text x="400" y="43" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="JetBrains Mono">Policy</text>
        
        {/* Node 4: S3 Bucket */}
        <circle cx="400" cy="120" r="16" fill="var(--bg-base)" stroke="var(--border-hairline)" strokeWidth="1" />
        <text x="400" y="143" textAnchor="middle" fill="var(--text-muted)" fontSize="7" fontFamily="Inter">S3 Bucket</text>
        <text x="400" y="123" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="JetBrains Mono">Data</text>
        
        {/* Node 5: Admin */}
        <rect x="512" y="22" width="36" height="36" rx="6" fill="var(--bg-surface)" stroke="var(--color-primary)" strokeWidth="1" />
        <text x="530" y="44" textAnchor="middle" fill="var(--color-primary)" fontSize="8" fontFamily="JetBrains Mono">Admin</text>
      </svg>
    </div>
  );
}

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
    setAuthNotice,
    setDemoMode,
    theme,
    setTheme
  } = useVektraStore();

  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const tier = (currentUser?.tier || "free").toLowerCase();
  const credits = currentUser?.credits_balance ?? 0;
  const isFree = tier === "free";
  const agentsUnlocked = ["pro", "team"].includes(tier);

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
    
    setDemoMode(false);
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

    let cleanText = policyText.trim();
    while (cleanText.startsWith("//") || cleanText.startsWith("/*") || cleanText.startsWith("#")) {
      if (cleanText.startsWith("//") || cleanText.startsWith("#")) {
        const eol = cleanText.indexOf("\n");
        if (eol === -1) {
          cleanText = "";
          break;
        }
        cleanText = cleanText.substring(eol).trim();
      } else if (cleanText.startsWith("/*")) {
        const end = cleanText.indexOf("*/");
        if (end === -1) {
          cleanText = "";
          break;
        }
        cleanText = cleanText.substring(end + 2).trim();
      }
    }

    let detectedFormat = format;
    if (cleanText.startsWith("{") || cleanText.startsWith("[")) {
      detectedFormat = "iam";
    } else if (cleanText.includes("apiVersion:") || cleanText.includes("kind:") || cleanText.includes("rules:")) {
      detectedFormat = "k8s";
    }

    if (detectedFormat !== format) {
      setFormat(detectedFormat);
    }

    try {
      const result = await runAnalysis();
      if (result && result.session_id) {
        navigate(`/analyzing/${result.session_id}`);
      } else {
        navigate("/analyze");
      }
    } catch (e) {
      setErrorMsg(e.message || "Failed to analyze policy. Please check syntax or backend logs.");
    }
  };

  const handleTryDemo = async () => {
    setErrorMsg("");
    setFormat("iam");
    setPolicyText(HARDCODED_SAMPLE_IAM);
    setDemoMode(true);

    try {
      const result = await runAnalysis();
      if (result && result.session_id) {
        navigate(`/analyzing/${result.session_id}`);
      } else {
        navigate("/analyze");
      }
    } catch (e) {
      setErrorMsg(e.message || "Failed to initialize demo session. Please try again.");
    }
  };

  const handleLoadSample = (sampleType) => {
    setDemoMode(false);
    if (sampleType === "iam") {
      setFormat("iam");
      setPolicyText(HARDCODED_SAMPLE_IAM);
    } else {
      setFormat("k8s");
      setPolicyText(HARDCODED_SAMPLE_K8S);
    }
  };

  return (
    <div className="min-h-screen bg-pageBg text-textMain flex flex-col justify-between selection:bg-primary/20 relative" style={{backgroundImage: "radial-gradient(at 20% 0%, rgba(59,130,246,0.06) 0px, transparent 50%), radial-gradient(at 80% 10%, rgba(139,92,246,0.04) 0px, transparent 50%)"}}>
      
      {/* ── TOP NAV ── */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-cardBorder bg-pageBg z-30">
        <div className="flex items-center gap-2.5">
          <div className="bg-cardSurface border border-cardBorder p-1.5 rounded-[6px]">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <span 
            onClick={() => currentUser ? navigate("/dashboard") : navigate("/")}
            className="font-sans font-bold text-sm tracking-wide text-textMain cursor-pointer"
          >
            VEKTRA
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => handleLoadSample("iam")}
            className="hidden sm:inline-block px-2.5 py-1.5 rounded-[6px] border border-cardBorder text-xs text-muted hover:text-textMain hover:bg-cardSurface transition-fast"
          >
            Sample IAM
          </button>
          <button 
            onClick={() => handleLoadSample("k8s")}
            className="hidden sm:inline-block px-2.5 py-1.5 rounded-[6px] border border-cardBorder text-xs text-muted hover:text-textMain hover:bg-cardSurface transition-fast"
          >
            Sample RBAC
          </button>
          <div className="h-4 w-[1px] bg-cardBorder mx-1" />
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-1.5 rounded-[6px] border border-cardBorder bg-cardSurface/50 text-muted hover:text-textMain transition-fast flex items-center justify-center"
            title="Toggle Light/Dark Theme"
          >
            {theme === "light" ? (
              <Moon className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-primary" />
            )}
          </button>
          <AuthNav />
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-8 py-16 space-y-12 z-10">
        
        {/* Hero Area */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          {authNotice && (
            <button
              onClick={() => setAuthNotice("")}
              className="mx-auto block rounded-[6px] border border-warning/20 bg-warning/5 px-3.5 py-1 text-[11px] font-semibold text-warning transition-fast hover:bg-warning/10"
            >
              {authNotice}
            </button>
          )}
          <h1 className="font-sans font-bold text-4xl tracking-tight leading-[1.1] text-textMain">
            Analyze Policy Risk
          </h1>
          <p className="text-xs md:text-sm text-muted max-w-lg mx-auto leading-relaxed font-normal">
            Identify privilege escalation paths and misconfigurations instantly.
          </p>
        </div>

        {/* Action / Format Toggle */}
        <div className="flex justify-center">
          <div className="flex bg-cardSurface p-1 rounded-[6px] border border-cardBorder">
            <button
              onClick={() => setFormat("iam")}
              className={`px-4 py-1.5 rounded-[6px] text-xs font-medium tracking-wide transition-fast ${
                format === "iam" 
                  ? "bg-activeNav text-textMain border border-cardBorder shadow-sm" 
                  : "text-muted hover:text-textMain"
              }`}
            >
              AWS IAM JSON
            </button>
            <button
              onClick={() => setFormat("k8s")}
              className={`px-4 py-1.5 rounded-[6px] text-xs font-medium tracking-wide transition-fast ${
                format === "k8s" 
                  ? "bg-activeNav text-textMain border border-cardBorder shadow-sm" 
                  : "text-muted hover:text-textMain"
              }`}
            >
              K8S RBAC YAML
            </button>
          </div>
        </div>

        {/* Alert for Credits */}
        {currentUser && isFree && credits < 5 && (
          <div className="max-w-4xl w-full border border-warning/20 bg-warning/5 rounded-[6px] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <span className="text-warning font-medium">
              ⚠️ Wallet Balance: {credits} credits left. AI agent analysis costs 5 credits.
            </span>
            <Link to="/pricing" className="text-primary hover:underline font-bold shrink-0">
              Upgrade for unlimited credits →
            </Link>
          </div>
        )}

        {/* Dynamic Graphic Visual (Signature Element) */}
        <div className="max-w-3xl w-full mx-auto">
          <SecurityGraphVisual />
        </div>

        {/* Redesigned Input Zone */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
          
          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`glass-card rounded-lg border-dashed transition-fast p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] ${
              dragActive 
                ? "border-primary border-2 bg-primary/5" 
                : "hover:border-muted/40"
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
              <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-textMain">
                  Drop IAM or RBAC configuration file
                </p>
                <p className="text-[11px] text-muted font-normal">
                  Supports AWS IAM JSON and Kubernetes YAML
                </p>
              </div>
              <div className="text-[9px] text-muted bg-pageBg/80 border border-cardBorder px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                {format === "iam" ? ".json" : ".yaml / .yml"}
              </div>
            </label>
          </div>

          {/* Text Editor Area */}
          <div className="glass-card flex flex-col rounded-lg overflow-hidden min-h-[260px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-cardBorder bg-bgElevated">
              <div className="flex items-center gap-2 text-muted">
                <FileCode className="w-4 h-4 text-muted" />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
                  {format === "iam" ? "policy.json" : "rbac.yaml"}
                </span>
              </div>
              
              <div className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 ${
                policyText.trim() ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20" : "bg-bgElevated text-muted border border-cardBorder"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${policyText.trim() ? "bg-[#22C55E]" : "bg-muted"}`} />
                <span>{policyText.trim() ? "Active" : "Empty"}</span>
              </div>
            </div>
            <textarea
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
              className="flex-1 w-full bg-transparent p-4 text-[11px] font-mono text-textMain placeholder-muted focus:outline-none resize-none min-h-[200px]"
              placeholder={
                format === "iam" 
                  ? "Paste your AWS IAM JSON policy statement here..." 
                  : "Paste your Kubernetes Role & Binding YAML configs here..."
              }
            />
          </div>

        </div>

        {/* CTA Buttons - Upload or Try Demo */}
        <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-3.5 pt-4">
          <button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || !policyText.trim()}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-sans font-semibold text-xs rounded-[6px] shadow-sm transition-fast flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed border border-primary/20"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>Analyze Policy</span>
              </>
            )}
          </button>

          <button
            onClick={handleTryDemo}
            disabled={isAnalyzing}
            className="w-full h-10 bg-cardSurface hover:bg-bgElevated border border-cardBorder text-textMain font-sans font-semibold text-xs rounded-[6px] shadow-sm transition-fast flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Load Demo</span>
          </button>
        </div>

        {/* Trusted By Section (Muted, Enterprise style) */}
        <div className="pt-10 border-t border-cardBorder text-center space-y-3.5 max-w-4xl mx-auto w-full">
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest block font-mono">
            Integrations
          </span>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-30">
            <span className="text-[11px] font-mono tracking-widest font-semibold text-muted">AWS</span>
            <span className="text-[11px] font-mono tracking-widest font-semibold text-muted">Kubernetes</span>
            <span className="text-[11px] font-mono tracking-widest font-semibold text-muted">Neo4j</span>
            <span className="text-[11px] font-mono tracking-widest font-semibold text-muted">Stellar</span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-cardBorder flex items-center justify-center text-[10px] text-muted bg-pageBg font-mono">
        Vektra
      </footer>

    </div>
  );
}
