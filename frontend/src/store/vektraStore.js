import { create } from "zustand";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? ""
    : "http://localhost:8000");

// Standard sample policies
const SAMPLE_IAM = `{
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

const SAMPLE_K8S = `apiVersion: rbac.authorization.k8s.io/v1
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

const generateUUID = () => {
  return "session-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useVektraStore = create((set, get) => ({
  // Credentials
  apiKey: localStorage.getItem("vektra_sarvam_api_key") || "",
  setApiKey: (key) => {
    localStorage.setItem("vektra_sarvam_api_key", key);
    set({ apiKey: key });
  },

  // Session & Input State
  sessionId: generateUUID(),
  policyText: SAMPLE_IAM,
  format: "iam",
  setPolicyText: (text) => set({ policyText: text }),
  setFormat: (fmt) => {
    const defaultText = fmt === "iam" ? SAMPLE_IAM : SAMPLE_K8S;
    set({ format: fmt, policyText: defaultText });
  },
  resetSession: () => set({ sessionId: generateUUID() }),

  // Loaded Samples
  loadSample: (type) => {
    if (type === "iam") {
      set({ format: "iam", policyText: SAMPLE_IAM });
    } else {
      set({ format: "k8s", policyText: SAMPLE_K8S });
    }
  },

  // Analysis Results
  nodes: [],
  edges: [],
  conflicts: [],
  stats: {
    total_rules: 0,
    conflicts_found: 0,
    warnings_found: 0,
    risk_score: 0,
    executive_summary: "No analysis run yet. Upload a policy to get started.",
    top_priorities: [],
    compliance_notes: "",
    risk_label: "LOW",
    most_dangerous_rule: null,
  },

  selectedNodeId: null,
  selectedConflictId: null,
  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedConflictId: null }),
  selectConflict: (conflictId) => set({ selectedConflictId: conflictId, selectedNodeId: null }),

  // Status
  isAnalyzing: false,
  agentStatus: {
    analyst: "idle",  // "idle" | "running" | "completed" | "failed"
    advisor: "idle",
    scorer: "idle",
  },

  // Conversation history
  chatHistory: [],
  isChatting: false,
  clearChat: () => set({ chatHistory: [] }),

  // Recent Session History
  recentAnalyses: JSON.parse(localStorage.getItem("vektra_recent_analyses") || "[]"),
  addRecentAnalysis: (analysisSummary) => {
    const current = get().recentAnalyses;
    // Remove if duplicate session_id
    const filtered = current.filter(x => x.session_id !== analysisSummary.session_id);
    const updated = [analysisSummary, ...filtered].slice(0, 5); // store up to 5
    localStorage.setItem("vektra_recent_analyses", JSON.stringify(updated));
    set({ recentAnalyses: updated });
  },
  clearRecentAnalyses: () => {
    localStorage.removeItem("vektra_recent_analyses");
    set({ recentAnalyses: [] });
  },

  // Run Analysis Pipeline
  runAnalysis: async () => {
    set({
      isAnalyzing: true,
      selectedNodeId: null,
      selectedConflictId: null,
      chatHistory: [],
      agentStatus: {
        analyst: "running",
        advisor: "running",
        scorer: "running",
      }
    });

    const { policyText, format, sessionId, apiKey } = get();

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-Sarvam-API-Key": apiKey } : {}),
        },
        body: JSON.stringify({
          policy_text: policyText,
          format: format,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Server error occurred during analysis.");
      }

      const data = await response.json();
      const vulnerabilities = data.vulnerabilities || data.conflicts || [];

      set({
        nodes: data.nodes || [],
        edges: data.edges || [],
        conflicts: vulnerabilities,
        stats: data.stats || {
          total_rules: 0,
          conflicts_found: 0,
          warnings_found: 0,
          risk_score: 0,
          executive_summary: "",
          top_priorities: [],
          compliance_notes: "",
          risk_label: "LOW",
          most_dangerous_rule: null,
        },
        agentStatus: {
          analyst: "completed",
          advisor: vulnerabilities.some(c => c.severity === "CRITICAL" || c.severity === "WARNING") ? "completed" : "idle",
          scorer: "completed",
        },
        isAnalyzing: false,
      });

      // Add to recent list
      get().addRecentAnalysis({
        session_id: sessionId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + new Date().toLocaleDateString(),
        format: format.toUpperCase(),
        risk_score: data.stats?.risk_score || 0,
        total_rules: data.nodes?.length || 0,
        policyText: policyText,
        nodes: data.nodes || [],
        edges: data.edges || [],
        conflicts: vulnerabilities,
        stats: data.stats || {},
      });

    } catch (e) {
      console.error(e);
      set({
        isAnalyzing: false,
        agentStatus: {
          analyst: "failed",
          advisor: "failed",
          scorer: "failed",
        }
      });
      throw e;
    }
  },

  // Load a recent analysis from history
  loadRecentAnalysis: (session) => {
    set({
      sessionId: session.session_id,
      policyText: session.policyText,
      format: session.format.toLowerCase(),
      nodes: session.nodes,
      edges: session.edges,
      conflicts: session.conflicts,
      stats: session.stats,
      selectedNodeId: null,
      selectedConflictId: null,
      chatHistory: [],
      agentStatus: {
        analyst: "completed",
        advisor: session.conflicts.some(c => c.severity === "CRITICAL" || c.severity === "WARNING") ? "completed" : "idle",
        scorer: "completed",
      }
    });
  },

  // Send message to assistant
  sendChatMessage: async (messageText) => {
    const { chatHistory, policyText, format, sessionId, apiKey } = get();
    
    // Add user message
    const updatedHistory = [...chatHistory, { role: "user", content: messageText }];
    set({
      chatHistory: updatedHistory,
      isChatting: true,
    });

    try {
      // Append an empty assistant response to stream into
      set(state => ({
        chatHistory: [...state.chatHistory, { role: "assistant", content: "" }]
      }));

      // Send to SSE endpoint
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-Sarvam-API-Key": apiKey } : {}),
        },
        body: JSON.stringify({
          message: messageText,
          policy_context: `Policy Format: ${format}\nPolicy Content:\n${policyText}`,
          session_id: sessionId,
          history: chatHistory,
        })
      });

      if (!response.ok) {
        throw new Error("Chat service unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Process SSE lines
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.response) {
                assistantText += data.response;
                
                // Update the last element in history
                set(state => {
                  const hist = [...state.chatHistory];
                  if (hist.length > 0) {
                    hist[hist.length - 1] = { role: "assistant", content: assistantText };
                  }
                  return { chatHistory: hist };
                });
              }
            } catch {
              // Ignore partial parsing errors
            }
          }
        }
      }

      set({ isChatting: false });

    } catch (e) {
      console.error(e);
      set(state => {
        const hist = [...state.chatHistory];
        if (hist.length > 0) {
          hist[hist.length - 1] = {
            role: "assistant",
            content: `[Error: Failed to connect to chat agent. Make sure the API server is running and your Sarvam API key is configured.]`
          };
        }
        return { chatHistory: hist, isChatting: false };
      });
    }
  }
}));
