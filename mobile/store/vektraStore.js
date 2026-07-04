import { create } from "zustand";

const severityRank = {
  CRITICAL: 3,
  WARNING: 2,
  INFO: 1,
  SAFE: 0
};

const useVektraStore = create((set, get) => ({
  analysisResult: null,
  selectedVuln: null,
  isAnalyzing: false,
  format: "iam",
  history: [],

  setAnalysisResult: (result) => set({ analysisResult: result }),
  setSelectedVuln: (vuln) => set({ selectedVuln: vuln }),
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),
  setFormat: (format) => set({ format }),
  setHistory: (history) => set({ history }),

  sortedVulnerabilities: () => {
    const result = get().analysisResult;
    const vulnerabilities = result?.vulnerabilities || result?.conflicts || [];
    return [...vulnerabilities].sort(
      (left, right) => (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0)
    );
  },

  reset: () =>
    set({
      analysisResult: null,
      selectedVuln: null,
      isAnalyzing: false
    })
}));

export default useVektraStore;
