import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { TEST_CASES, useVektraStore } from "../store/vektraStore";
import { Beaker, Play, ShieldAlert, TerminalSquare } from "lucide-react";

export default function TestLabPage() {
  const navigate = useNavigate();
  const { loadTestCase, runAnalysis, isAnalyzing } = useVektraStore();

  const loadOnly = (testCase) => {
    loadTestCase(testCase);
    navigate("/");
  };

  const runNow = async (testCase) => {
    loadTestCase(testCase);
    await runAnalysis();
    navigate("/analyze");
  };

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#1e2240] pb-5">
              <div>
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                  <Beaker className="w-4 h-4" />
                  Vulnerability Test Lab
                </div>
                <h1 className="font-heading text-3xl font-bold text-white">Run controlled vulnerable policies</h1>
                <p className="text-sm text-muted mt-2 max-w-2xl">
                  These are explicit test inputs for demo validation. They are not loaded into a new account until you choose one.
                </p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning max-w-sm">
                Sarvam fixes use AI when a valid key is configured; otherwise VEKTRA shows local remediation guidance.
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {TEST_CASES.map((testCase) => (
                <article
                  key={testCase.id}
                  className="bg-[#141628] border border-[#1e2240] rounded-2xl p-5 flex flex-col min-h-[280px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className="rounded-full border border-[#1e2240] px-2.5 py-1 text-[10px] font-bold text-muted">
                      {testCase.format.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-heading text-lg font-semibold text-white mt-4">{testCase.title}</h2>
                  <p className="text-xs text-muted leading-5 mt-2 flex-1">{testCase.summary}</p>
                  <div className="mt-4 rounded-xl bg-[#08080e] border border-[#1e2240] p-3">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted mb-2">
                      <TerminalSquare className="w-3.5 h-3.5" />
                      Test input preview
                    </div>
                    <pre className="text-[10px] text-slate-400 font-mono leading-4 max-h-24 overflow-hidden whitespace-pre-wrap">
                      {testCase.policyText.slice(0, 260)}
                    </pre>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={() => loadOnly(testCase)}
                      className="h-10 rounded-lg border border-[#1e2240] text-xs font-semibold text-slate-200 hover:bg-[#1e2240] transition-colors"
                    >
                      Load
                    </button>
                    <button
                      disabled={isAnalyzing}
                      onClick={() => runNow(testCase)}
                      className="h-10 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
