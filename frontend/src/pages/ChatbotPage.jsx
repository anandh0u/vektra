import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useVektraStore } from "../store/vektraStore";
import { Send, Loader2, Bot, User, Trash2, ShieldAlert, Sparkles } from "lucide-react";

const SUGGESTED_QUERIES = [
  { text: "Generate least-privilege S3 bucket policy", query: "Can you generate a least-privilege bucket policy allowing read-only access for a specific IAM role and denying wildcard public permissions?" },
  { text: "Explain iam:CreatePolicyVersion risk", query: "Explain in detail how an attacker can exploit iam:CreatePolicyVersion to escalate privileges in an AWS account." },
  { text: "List remediation for CIS 1.2 failures", query: "What are the step-by-step remediation commands to enable MFA for all console accounts?" }
];

export default function ChatbotPage() {
  const { chatHistory, isChatting, sendChatMessage, clearChat } = useVektraStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isChatting) return;
    sendChatMessage(input.trim());
    setInput("");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatting]);

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden p-8 flex flex-col justify-between max-w-5xl mx-auto w-full">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cardBorder/40 pb-4 shrink-0">
            <div>
              <h1 className="text-xl font-bold text-textMain flex items-center gap-2 uppercase tracking-tight">
                <Bot className="h-5 w-5 text-primary" />
                Vektra AI Assistant
              </h1>
              <p className="mt-0.5 text-xs text-muted font-normal">
                Ask questions, generate least-privilege IAM policies, and summarize compliance findings.
              </p>
            </div>
            {chatHistory.length > 0 && (
              <button
                onClick={clearChat}
                className="bg-cardSurface hover:bg-bgElevated border border-cardBorder text-muted hover:text-[#FF5C4D] px-3 py-1.5 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-fast"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Conversation
              </button>
            )}
          </div>

          {/* Chat Scroll Area */}
          <div className="flex-1 overflow-y-auto py-6 space-y-4 px-1" ref={scrollRef}>
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 py-12">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-sm font-bold text-textMain uppercase tracking-wide">How can I assist your AWS IAM analysis?</h2>
                  <p className="text-xs text-muted leading-relaxed font-normal">
                    Vektra AI compiles threat modeling outputs, CIS benchmarks, and Neo4j relationship paths. Ask any policy questions or pick a security shortcut query below.
                  </p>
                </div>

                {/* Suggested Queries Grid */}
                <div className="grid grid-cols-1 gap-2.5 w-full pt-4">
                  {SUGGESTED_QUERIES.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendChatMessage(q.query)}
                      className="w-full text-left p-3 bg-cardSurface border border-cardBorder hover:border-primary/30 rounded-[6px] text-xs text-textMain transition-fast block leading-relaxed font-normal hover:bg-bgElevated/40"
                    >
                      <span className="font-semibold text-primary block mb-0.5">Shortcut query {idx + 1}</span>
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto w-full">
                {chatHistory.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-[6px] bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`p-4 rounded-[6px] max-w-[80%] text-xs leading-relaxed font-normal ${
                        isUser 
                          ? "bg-primary text-white" 
                          : "bg-cardSurface border border-cardBorder text-textMain shadow-sm"
                      }`}>
                        <div className="space-y-1">
                          <span className={`text-[8px] font-bold uppercase tracking-wider block font-mono ${isUser ? "text-white/60" : "text-muted"}`}>
                            {isUser ? "Security Operator" : "Vektra AI Agent"}
                          </span>
                          <p className="whitespace-pre-line font-normal">{msg.content}</p>
                        </div>
                      </div>
                      {isUser && (
                        <div className="w-7 h-7 rounded-[6px] bg-bgElevated border border-cardBorder flex items-center justify-center flex-shrink-0 text-muted mt-0.5 text-xs font-bold uppercase font-mono">
                          OP
                        </div>
                      )}
                    </div>
                  );
                })}

                {isChatting && (
                  <div className="flex gap-3.5 justify-start">
                    <div className="w-7 h-7 rounded-[6px] bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-cardSurface border border-cardBorder text-muted p-4 rounded-[6px] text-xs font-mono tracking-wider animate-pulse">
                      Generating remediations...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Input Area */}
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-cardBorder/40 pt-4 shrink-0 max-w-3xl mx-auto w-full">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isChatting}
              placeholder="Ask for policy fixes, explain findings..."
              className="flex-1 bg-cardSurface border border-cardBorder rounded-[6px] px-4 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
            />
            <button
              type="submit"
              disabled={isChatting || !input.trim()}
              className="h-10 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white px-5 rounded-[6px] text-xs font-semibold transition-fast border border-primary/20 flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>

        </main>
      </div>
    </div>
  );
}
