import { create } from "zustand";

const API = import.meta.env.VITE_API_URL || "";

export const TEST_CASES = [
  {
    id: "iam-conflict-escalation",
    title: "IAM conflict and escalation",
    format: "iam",
    summary: "Allow/Deny overlap, admin wildcard, sensitive wildcard resource, and policy-version escalation.",
    policyText: `{
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
      "Action": ["s3:DeleteBucket", "ec2:TerminateInstances"],
      "Resource": ["*"]
    },
    {
      "Sid": "AllowAdminWildcard",
      "Effect": "Allow",
      "Action": ["*"],
      "Resource": ["*"]
    }
  ]
}`
  },
  {
    id: "iam-negated-scope",
    title: "IAM negated scope review",
    format: "iam",
    summary: "Uses NotAction and NotResource so VEKTRA can flag inverted permission scope.",
    policyText: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "NotAction": "iam:DeleteUser",
      "NotResource": "arn:aws:s3:::restricted-bucket/*"
    },
    {
      "Effect": "Deny",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::restricted-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalTag/team": "security"
        }
      }
    }
  ]
}`
  },
  {
    id: "k8s-rbac-bypass",
    title: "Kubernetes RBAC bypass",
    format: "k8s",
    summary: "ClusterRoleBinding bypasses namespace scoping and grants secret read access.",
    policyText: `apiVersion: rbac.authorization.k8s.io/v1
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
  name: secret-reader-binding
subjects:
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io`
  }
];

const generateUUID = () => {
  return "session-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const readJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getSessionUser = () => readJSON("vektra_current_user", null);

const recentKeyFor = (user) => `vektra_recent_analyses_${user?.email || "guest"}`;

const defaultStats = {
  total_rules: 0,
  conflicts_found: 0,
  warnings_found: 0,
  risk_score: 0,
  executive_summary: "No analysis run yet. Paste a policy or open the test lab to begin.",
  top_priorities: [],
  top_3_priorities: [],
  compliance_notes: "",
  risk_label: "LOW",
  most_dangerous_rule: null,
};

export const matchesSearch = (item, query) => {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    item?.id,
    item?.label,
    item?.title,
    item?.type,
    item?.code,
    item?.severity,
    item?.effect,
    item?.source_file,
    item?.role_name,
    item?.namespace,
    ...(item?.actions || []),
    ...(item?.resources || []),
    ...(item?.principals || []),
    ...(item?.affected_rules || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
};

export const useVektraStore = create((set, get) => {
  const initialUser = getSessionUser();

  return {
    currentUser: initialUser,
    authMode: "signup",
    authError: "",
    setAuthMode: (mode) => set({ authMode: mode, authError: "" }),
    signup: ({ name, email, password }) => {
      const cleanEmail = normalizeEmail(email);
      if (!name?.trim() || !cleanEmail || !password) {
        throw new Error("Name, email, and password are required.");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      const users = readJSON("vektra_users", []);
      if (users.some((user) => user.email === cleanEmail)) {
        throw new Error("An account already exists for this email.");
      }
      const user = {
        id: generateUUID(),
        name: name.trim(),
        email: cleanEmail,
        created_at: new Date().toISOString(),
      };
      const storedUser = { ...user, password };
      localStorage.setItem("vektra_users", JSON.stringify([...users, storedUser]));
      localStorage.setItem("vektra_current_user", JSON.stringify(user));
      set({
        currentUser: user,
        authError: "",
        recentAnalyses: [],
        policyText: "",
        nodes: [],
        edges: [],
        conflicts: [],
        stats: defaultStats,
      });
      return user;
    },
    login: ({ email, password }) => {
      const cleanEmail = normalizeEmail(email);
      const users = readJSON("vektra_users", []);
      const found = users.find((user) => user.email === cleanEmail && user.password === password);
      if (!found) {
        throw new Error("Invalid email or password.");
      }
      const user = {
        id: found.id,
        name: found.name,
        email: found.email,
        created_at: found.created_at,
      };
      localStorage.setItem("vektra_current_user", JSON.stringify(user));
      set({
        currentUser: user,
        authError: "",
        recentAnalyses: readJSON(recentKeyFor(user), []),
        policyText: "",
        nodes: [],
        edges: [],
        conflicts: [],
        stats: defaultStats,
      });
      return user;
    },
    logout: () => {
      localStorage.removeItem("vektra_current_user");
      set({
        currentUser: null,
        policyText: "",
        nodes: [],
        edges: [],
        conflicts: [],
        selectedNodeId: null,
        selectedConflictId: null,
        chatHistory: [],
        stats: defaultStats,
        searchQuery: "",
      });
    },

    apiKey: localStorage.getItem("vektra_sarvam_api_key") || "",
    setApiKey: (key) => {
      localStorage.setItem("vektra_sarvam_api_key", key);
      set({ apiKey: key });
    },

    sessionId: generateUUID(),
    policyText: "",
    format: "iam",
    setPolicyText: (text) => set({ policyText: text }),
    setFormat: (fmt) => set({ format: fmt }),
    resetSession: () => set({ sessionId: generateUUID() }),
    loadTestCase: (testCase) => {
      set({
        format: testCase.format,
        policyText: testCase.policyText,
        sessionId: generateUUID(),
        selectedNodeId: null,
        selectedConflictId: null,
      });
    },

    nodes: [],
    edges: [],
    conflicts: [],
    stats: defaultStats,

    selectedNodeId: null,
    selectedConflictId: null,
    selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedConflictId: null }),
    selectConflict: (conflictId) => set({ selectedConflictId: conflictId, selectedNodeId: null }),

    searchQuery: "",
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    clearSearch: () => set({ searchQuery: "" }),

    isAnalyzing: false,
    agentStatus: {
      analyst: "idle",
      advisor: "idle",
      scorer: "idle",
    },

    chatHistory: [],
    isChatting: false,
    clearChat: () => set({ chatHistory: [] }),

    recentAnalyses: readJSON(recentKeyFor(initialUser), []),
    addRecentAnalysis: (analysisSummary) => {
      const user = get().currentUser;
      const current = get().recentAnalyses;
      const filtered = current.filter((item) => item.session_id !== analysisSummary.session_id);
      const updated = [analysisSummary, ...filtered].slice(0, 5);
      localStorage.setItem(recentKeyFor(user), JSON.stringify(updated));
      set({ recentAnalyses: updated });
    },
    clearRecentAnalyses: () => {
      const user = get().currentUser;
      localStorage.removeItem(recentKeyFor(user));
      set({ recentAnalyses: [] });
    },

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
        },
      });

      const { policyText, format, sessionId, apiKey } = get();

      try {
        const response = await fetch(`${API}/api/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "X-Sarvam-API-Key": apiKey } : {}),
          },
          body: JSON.stringify({
            policy_text: policyText,
            format,
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
          stats: data.stats || defaultStats,
          agentStatus: {
            analyst: "completed",
            advisor: "completed",
            scorer: "completed",
          },
          isAnalyzing: false,
        });

        get().addRecentAnalysis({
          session_id: sessionId,
          timestamp:
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
            ", " +
            new Date().toLocaleDateString(),
          format: format.toUpperCase(),
          risk_score: data.stats?.risk_score || 0,
          total_rules: data.nodes?.length || 0,
          policyText,
          nodes: data.nodes || [],
          edges: data.edges || [],
          conflicts: vulnerabilities,
          stats: data.stats || {},
        });
      } catch (error) {
        console.error(error);
        set({
          isAnalyzing: false,
          agentStatus: {
            analyst: "failed",
            advisor: "failed",
            scorer: "failed",
          },
        });
        throw error;
      }
    },

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
          advisor: "completed",
          scorer: "completed",
        },
      });
    },

    sendChatMessage: async (messageText) => {
      const { chatHistory, policyText, format, sessionId, apiKey } = get();
      const updatedHistory = [...chatHistory, { role: "user", content: messageText }];
      set({
        chatHistory: updatedHistory,
        isChatting: true,
      });

      try {
        set((state) => ({
          chatHistory: [...state.chatHistory, { role: "assistant", content: "" }],
        }));

        const response = await fetch(`${API}/api/chat`, {
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
          }),
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
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.response) {
                  assistantText += data.response;
                  set((state) => {
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
      } catch (error) {
        console.error(error);
        set((state) => {
          const hist = [...state.chatHistory];
          if (hist.length > 0) {
            hist[hist.length - 1] = {
              role: "assistant",
              content:
                "[Error: Chat needs a valid Sarvam API key. Save one in Settings or configure SARVAM_API_KEY on the backend.]",
            };
          }
          return { chatHistory: hist, isChatting: false };
        });
      }
    },
  };
});
