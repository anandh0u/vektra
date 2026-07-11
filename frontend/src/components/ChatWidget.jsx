import React, { useState, useRef, useEffect } from "react";
import { useVektraStore } from "../store/vektraStore";
import { Send, Loader2, Bot, User, Trash2, ChevronDown } from "lucide-react";

export default function ChatWidget() {
  const { chatHistory, isChatting, sendChatMessage, clearChat } = useVektraStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isChatting) return;
    sendChatMessage(input.trim());
    setInput("");
  };

  // Auto-scroll chat history to the bottom on new message
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatting, isExpanded]);

  return (
    <div className="flex flex-col bg-[#0d0f1a] border border-[#1e2240] rounded-xl overflow-hidden">
      {/* Chat Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 border-b border-[#1e2240] bg-[#0a0c16] flex items-center justify-between cursor-pointer hover:bg-[#141628]/40 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Ask VEKTRA Assistant
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {chatHistory.length > 0 && isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearChat();
              }}
              className="p-1 hover:text-danger text-muted transition-colors rounded hover:bg-[#141628]"
              title="Clear Chat History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Messages Scroll Area */}
          <div 
            ref={scrollRef}
            className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[160px] max-h-[300px]"
          >
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                <div className="space-y-1.5">
                  <Bot className="w-8 h-8 text-muted/40 mx-auto" />
                  <p className="text-[11px] text-muted leading-relaxed max-w-[180px]">
                    Ask questions about the active policy statement, vulnerability details, or suggested fixes.
                  </p>
                </div>

                <div className="w-full space-y-1.5 pt-1">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider block text-left px-1">Suggested Queries</span>
                  <button
                    type="button"
                    onClick={() => sendChatMessage("Explain the privilege escalation risks in this policy.")}
                    className="w-full text-left px-2.5 py-1.5 bg-[#141628]/60 border border-[#1e2240] hover:border-primary/50 text-[10px] text-slate-300 rounded-lg transition-all duration-200 block truncate"
                  >
                    🔍 Explain escalation risks
                  </button>
                  <button
                    type="button"
                    onClick={() => sendChatMessage("How can I safely narrow down the wildcard '*' access?")}
                    className="w-full text-left px-2.5 py-1.5 bg-[#141628]/60 border border-[#1e2240] hover:border-primary/50 text-[10px] text-slate-300 rounded-lg transition-all duration-200 block truncate"
                  >
                    🛠️ How to fix wildcard access
                  </button>
                  <button
                    type="button"
                    onClick={() => sendChatMessage("What are the best remediation steps for the critical vulnerabilities identified?")}
                    className="w-full text-left px-2.5 py-1.5 bg-[#141628]/60 border border-[#1e2240] hover:border-primary/50 text-[10px] text-slate-300 rounded-lg transition-all duration-200 block truncate"
                  >
                    🛡️ Suggest remediation details
                  </button>
                </div>
              </div>
            ) : (
              chatHistory.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                        <Bot className="w-3 h-3" />
                      </div>
                    )}
                    <div className={`p-2.5 rounded-lg max-w-[85%] text-[11px] leading-relaxed ${
                      isUser 
                        ? "bg-primary text-white" 
                        : "bg-[#141628] text-slate-300 border border-cardBorder"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content || (isChatting && idx === chatHistory.length - 1 ? "Typing..." : "")}</p>
                    </div>
                    {isUser && (
                      <div className="w-5 h-5 rounded bg-[#1e2240] flex items-center justify-center flex-shrink-0 text-muted mt-0.5">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Input area */}
          <form 
            onSubmit={handleSubmit}
            className="border-t border-[#1e2240] p-2 bg-[#0a0c16] flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this policy..."
              className="flex-1 bg-[#141628] border border-[#1e2240] rounded-lg px-3 py-1.5 text-[11px] text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
              disabled={isChatting}
            />
            <button
              type="submit"
              className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
              disabled={!input.trim() || isChatting}
            >
              {isChatting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
          <div className="px-3 py-1 bg-[#08080e] border-t border-[#1e2240]/40 flex justify-between items-center text-[8px] text-muted font-medium select-none">
            <span>STATELESS SECURITY BOT</span>
            <span>POWERED BY SARVAM AI</span>
          </div>
        </>
      )}
    </div>
  );
}
