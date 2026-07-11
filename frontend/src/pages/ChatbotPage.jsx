import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { Send, Loader2, Bot, Trash2, Sparkles, Terminal, Calendar, Shield } from "lucide-react";

const ASSISTANT_COMMANDS = [
  { text: "/search access key", icon: Terminal, query: "/search access key" },
  { text: "/timeline", icon: Calendar, query: "/timeline" },
  { text: "/remediate path risk", icon: Shield, query: "/remediate" },
  { text: "/report summary", icon: Bot, query: "/report" }
];

export default function ChatbotPage() {
  const [history, setHistory] = useState([
    { role: "assistant", content: "Welcome to the VEKTRA Security Assistant. I can search your evidence, explain findings, build timelines, and suggest least-privilege fixes.\n\n- `/search <query>`: Search incident evidence\n- `/timeline`: Review the latest CloudTrail sequence\n- `/remediate`: Get remediation guidance\n- `/report`: View an executive summary" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const sendToAssistant = async (text) => {
    if (!text.trim() || loading) return;
    
    // Add user message
    const userMsg = { role: "user", content: text };
    setHistory((prev) => [...prev, userMsg]);
    setLoading(true);
    setInput("");

    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${API_BASE}/api/assistant/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ prompt: text })
      });
      if (!res.ok) throw new Error(`Assistant request failed (${res.status})`);
      const data = await res.json();
      
      setHistory((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { role: "assistant", content: "I could not reach the VEKTRA assistant service. Check your connection and try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendToAssistant(input);
  };

  const clearChat = () => {
    setHistory([
      { role: "assistant", content: "Conversation cleared. Ready for your security commands." }
    ]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden p-6 lg:p-8 flex flex-col justify-between max-w-5xl mx-auto w-full">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cardBorder/40 pb-4 shrink-0">
            <div>
              <h1 className="text-xl font-bold text-textMain flex items-center gap-2 uppercase tracking-tight">
                <Bot className="h-5 w-5 text-primary" />
                VEKTRA Security Assistant
              </h1>
              <p className="mt-0.5 text-xs text-muted font-normal">
                Query RAG context, review chronological logs, and request policy remediations.
              </p>
            </div>
            {history.length > 1 && (
              <button
                onClick={clearChat}
                className="bg-cardSurface hover:bg-bgElevated border border-cardBorder text-muted hover:text-[#FF5C4D] px-3 py-1.5 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-fast animate-fade-in"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear conversation
              </button>
            )}
          </div>

          {/* Chat Scroll Area */}
          <div className="flex-1 overflow-y-auto py-6 space-y-4 px-1" ref={scrollRef}>
            {history.length <= 1 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 py-12">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-sm font-bold text-textMain uppercase tracking-wide">Autonomous Command Console</h2>
                  <p className="text-xs text-muted leading-relaxed font-normal">
                    Query index entries, run path mitigation rules, or rebuild timelines in real time.
                  </p>
                </div>

                {/* Assistant workflow commands */}
                <div className="grid grid-cols-2 gap-3 w-full pt-4">
                  {ASSISTANT_COMMANDS.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.query}
                        onClick={() => sendToAssistant(cmd.query)}
                        className="text-left p-3.5 bg-cardSurface border border-cardBorder hover:border-primary/40 rounded-lg text-xs text-textMain transition-all hover:bg-bgElevated/30 flex items-center gap-3"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold block">{cmd.text}</span>
                          <span className="text-[10px] text-muted">Execute workflow</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto w-full">
                {history.map((msg, idx) => {
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
                            {isUser ? "Security Operator" : "VEKTRA Assistant"}
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

                {loading && (
                  <div className="flex gap-3.5 justify-start">
                    <div className="w-7 h-7 rounded-[6px] bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-cardSurface border border-cardBorder text-muted p-4 rounded-[6px] text-xs font-mono tracking-wider animate-pulse">
                      Executing workflow task...
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
              disabled={loading}
              placeholder="e.g. /search, /timeline, /remediate, /report..."
              className="flex-1 bg-cardSurface border border-cardBorder rounded-[6px] px-4 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white px-5 rounded-[6px] text-xs font-semibold transition-fast border border-primary/20 flex items-center gap-1.5 shadow-sm"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
