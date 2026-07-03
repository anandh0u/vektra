import React, { useState } from "react";
import { Clipboard, Check } from "lucide-react";

export default function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-[#1e2240] bg-[#08080e] mt-2 font-mono">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2240] bg-[#0a0c16] text-[10px] text-muted font-bold tracking-wider select-none">
        <span>{language ? language.toUpperCase() : "CODE"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-slate-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-safe" />
              <span className="text-safe">COPIED</span>
            </>
          ) : (
            <>
              <Clipboard className="w-3.5 h-3.5" />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <pre className="p-4 text-[11px] leading-relaxed overflow-x-auto text-slate-300 max-h-60 whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
    </div>
  );
}
