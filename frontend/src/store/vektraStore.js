import { create } from "zustand";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? ""
    : "http://localhost:8000");

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("vektra_user") || "null");
  } catch {
    localStorage.removeItem("vektra_user");
    return null;
  }
};

const saveAuthSession = ({ user, token }) => {
  localStorage.setItem("vektra_token", token);
  localStorage.setItem("vektra_user", JSON.stringify(user));
};

const clearAuthSession = () => {
  localStorage.removeItem("vektra_token");
  localStorage.removeItem("vektra_user");
};

const parseApiError = async (response, fallback) => {
  try {
    const data = await response.json();
    return data.detail || data.error || fallback;
  } catch {
    return fallback;
  }
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem("vektra_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
  // User Authentication
  currentUser: readStoredUser(),
  authToken: localStorage.getItem("vektra_token") || "",
  authNotice: "",
  setAuthNotice: (message) => set({ authNotice: message }),
  signUp: async (name, email, password) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, "Unable to create account."));
    }
    const data = await response.json();
    saveAuthSession(data);
    set({ currentUser: data.user, authToken: data.token, authNotice: "" });
    return data;
  },
  signIn: async (email, password) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, "Invalid email or password."));
    }
    const data = await response.json();
    saveAuthSession(data);
    set({ currentUser: data.user, authToken: data.token, authNotice: "" });
    return data;
  },
  refreshCurrentUser: async () => {
    const token = localStorage.getItem("vektra_token");
    if (!token) {
      clearAuthSession();
      set({ currentUser: null, authToken: "" });
      return null;
    }
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      clearAuthSession();
      set({ currentUser: null, authToken: "", authNotice: "Session expired, please sign in." });
      return null;
    }
    const data = await response.json();
    localStorage.setItem("vektra_user", JSON.stringify(data.user));
    set({ currentUser: data.user, authToken: token, authNotice: "" });
    return data.user;
  },
  signOut: () => {
    clearAuthSession();
    set({ currentUser: null, authToken: "", authNotice: "" });
  },

  // Credits, Plans & Themes
  credits: parseInt(localStorage.getItem("vektra_credits") || "0", 10),
  theme: localStorage.getItem("vektra_theme") || "dark",
  addCredits: (amount) => {
    const updated = get().credits + amount;
    localStorage.setItem("vektra_credits", updated.toString());
    set({ credits: updated });
  },
  deductCredits: (amount) => {
    const current = get().credits;
    if (current >= amount) {
      const updated = current - amount;
      localStorage.setItem("vektra_credits", updated.toString());
      set({ credits: updated });
      return true;
    }
    return false;
  },
  setTheme: (newTheme) => {
    localStorage.setItem("vektra_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    set({ theme: newTheme });
  },

  // Session & Input State
  sessionId: generateUUID(),
  policyText: "",
  format: "iam",
  setPolicyText: (text) => set({ policyText: text }),
  setFormat: (fmt) => {
    set({ format: fmt });
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
  analysisTier: "free",
  upgradePrompt: false,
  lockedFeatures: [],

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
    const { policyText, format, sessionId, currentUser, authToken } = get();
    const expectedTier = currentUser?.tier || "free";
    const expectsAgents = ["pro", "team"].includes(expectedTier);
    
    set({
      isAnalyzing: true,
      selectedNodeId: null,
      selectedConflictId: null,
      chatHistory: [],
      upgradePrompt: false,
      lockedFeatures: [],
      agentStatus: {
        analyst: expectsAgents ? "running" : "idle",
        advisor: expectsAgents ? "running" : "idle",
        scorer: expectsAgents ? "running" : "idle",
      }
    });

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          policy_text: policyText,
          format: format,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Server error occurred during analysis.");
        if (response.status === 401) {
          clearAuthSession();
          set({ currentUser: null, authToken: "", authNotice: "Session expired, please sign in." });
        }
        throw new Error(message);
      }

      const data = await response.json();
      const vulnerabilities = data.vulnerabilities || data.conflicts || [];
      const responseTier = data.tier || expectedTier;
      const agentsUnlocked = ["pro", "team"].includes(responseTier);
      const responseStats = data.stats || {
        total_rules: 0,
        conflicts_found: 0,
        warnings_found: 0,
        risk_score: 0,
        executive_summary: "",
        top_priorities: [],
        compliance_notes: "",
        risk_label: "LOW",
        most_dangerous_rule: null,
      };

      set({
        nodes: data.nodes || [],
        edges: data.edges || [],
        conflicts: vulnerabilities,
        stats: responseStats,
        analysisTier: responseTier,
        upgradePrompt: Boolean(data.upgrade_prompt),
        lockedFeatures: data.locked_features || [],
        agentStatus: {
          analyst: agentsUnlocked ? "completed" : "idle",
          advisor: (agentsUnlocked && vulnerabilities.some(c => c.severity === "CRITICAL" || c.severity === "WARNING")) ? "completed" : "idle",
          scorer: agentsUnlocked ? "completed" : "idle",
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
        tier: responseTier,
        upgrade_prompt: Boolean(data.upgrade_prompt),
        policyText: policyText,
        nodes: data.nodes || [],
        edges: data.edges || [],
        conflicts: vulnerabilities,
        stats: responseStats,
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
    const sessionTier = session.tier || session.stats?.tier || "free";
    const agentsUnlocked = ["pro", "team"].includes(sessionTier);
    set({
      sessionId: session.session_id,
      policyText: session.policyText,
      format: session.format.toLowerCase(),
      nodes: session.nodes,
      edges: session.edges,
      conflicts: session.conflicts,
      stats: session.stats,
      analysisTier: sessionTier,
      upgradePrompt: Boolean(session.upgrade_prompt || session.stats?.upgrade_prompt),
      lockedFeatures: session.stats?.locked_features || [],
      selectedNodeId: null,
      selectedConflictId: null,
      chatHistory: [],
      agentStatus: {
        analyst: agentsUnlocked ? "completed" : "idle",
        advisor: (agentsUnlocked && session.conflicts.some(c => c.severity === "CRITICAL" || c.severity === "WARNING")) ? "completed" : "idle",
        scorer: agentsUnlocked ? "completed" : "idle",
      }
    });
  },

  // Send message to assistant
  sendChatMessage: async (messageText) => {
    const { chatHistory, policyText, format, sessionId, credits, deductCredits, currentUser } = get();
    const tier = currentUser?.tier || "free";
    const paidTier = ["pro", "team"].includes(tier);
    
    // Add user message
    const updatedHistory = [...chatHistory, { role: "user", content: messageText }];
    set({
      chatHistory: updatedHistory,
      isChatting: true,
    });

    if (!paidTier && credits < 1) {
      set(state => ({
        chatHistory: [
          ...state.chatHistory,
          {
            role: "assistant",
            content: "[AI Locked] Upgrade to Pro to activate the Sarvam AI chat assistant."
          }
        ],
        isChatting: false
      }));
      return;
    }

    if (!paidTier) {
      deductCredits(1);
    }

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
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          message: messageText,
          policy_context: `Policy Format: ${format}\nPolicy Content:\n${policyText}`,
          session_id: sessionId,
          history: chatHistory,
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthSession();
          set({ currentUser: null, authToken: "", authNotice: "Session expired, please sign in." });
        }
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
            content: `[Error: Failed to connect to chat agent. Make sure the API server is running.]`
          };
        }
        return { chatHistory: hist, isChatting: false };
      });
    }
  },

  // Account Management & Wallet Upgrades
  rerunAnalysis: async (session_id, policy_text, format_val) => {
    const { authToken } = get();
    set({
      isAnalyzing: true,
      selectedNodeId: null,
      selectedConflictId: null,
      chatHistory: [],
      upgradePrompt: false,
      lockedFeatures: [],
      agentStatus: {
        analyst: "running",
        advisor: "running",
        scorer: "running",
      }
    });

    try {
      const response = await fetch(`${API_BASE}/api/analyze/rerun`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          session_id: session_id,
          policy_text: policy_text,
          format: format_val,
        }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, "Server error during rerun.");
        if (response.status === 401) {
          clearAuthSession();
          set({ currentUser: null, authToken: "", authNotice: "Session expired, please sign in." });
        }
        throw new Error(message);
      }

      const data = await response.json();
      const vulnerabilities = data.vulnerabilities || data.conflicts || [];
      const responseTier = data.tier || "pro";
      const responseStats = data.stats || {};

      set({
        sessionId: session_id,
        policyText: policy_text,
        format: format_val,
        nodes: data.nodes || [],
        edges: data.edges || [],
        conflicts: vulnerabilities,
        stats: responseStats,
        analysisTier: responseTier,
        upgradePrompt: Boolean(data.upgrade_prompt),
        lockedFeatures: data.locked_features || [],
        agentStatus: {
          analyst: "completed",
          advisor: vulnerabilities.some(c => c.severity === "CRITICAL" || c.severity === "WARNING") ? "completed" : "idle",
          scorer: "completed",
        },
        isAnalyzing: false,
      });

      await get().refreshCurrentUser();

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

  updateProfile: async (name) => {
    const response = await fetch(`${API_BASE}/api/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, "Failed to update profile."));
    }
    const data = await response.json();
    set({ currentUser: data.user });
    localStorage.setItem("vektra_user", JSON.stringify(data.user));
    return data.user;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, "Failed to change password."));
    }
    return await response.json();
  },

  updateNotifications: async (prefs) => {
    const response = await fetch(`${API_BASE}/api/auth/notifications`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ preferences: prefs }),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, "Failed to update notifications."));
    }
    const current = get().currentUser;
    if (current) {
      const updated = { ...current, notification_preferences: JSON.stringify(prefs) };
      set({ currentUser: updated });
      localStorage.setItem("vektra_user", JSON.stringify(updated));
    }
    return await response.json();
  },

  deleteAccount: async (confirmText) => {
    const response = await fetch(`${API_BASE}/api/auth/account`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ confirm: confirmText }),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, "Failed to delete account."));
    }
    clearAuthSession();
    set({ currentUser: null, authToken: "" });
    return await response.json();
  },

  upgradeWalletPlan: async (plan) => {
    const response = await fetch(`${API_BASE}/api/wallet/upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ plan }),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, "Failed to upgrade plan."));
    }
    const data = await response.json();
    const current = get().currentUser;
    if (current) {
      const updated = { ...current, tier: plan, credits_balance: data.credits };
      set({ currentUser: updated });
      localStorage.setItem("vektra_user", JSON.stringify(updated));
    }
    return data;
  },

  fetchWalletTransactions: async () => {
    const response = await fetch(`${API_BASE}/api/wallet/transactions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, "Failed to fetch transactions."));
    }
    const data = await response.json();
    return data.transactions || [];
  }
}));
