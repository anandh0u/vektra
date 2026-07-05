import React from "react";
import { Search } from "lucide-react";
import AuthNav from "./AuthNav";

export default function TopBar() {
  return (
    <header className="h-16 border-b border-[#1e2240] bg-[#0d0f1a] flex items-center justify-between px-8 select-none">
      {/* Search Input */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Filter rules, actions, resources..."
          className="w-full bg-[#141628] border border-[#1e2240] rounded-lg py-1.5 pl-10 pr-4 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
          disabled
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-[#1e2240] text-muted px-1.5 py-0.5 rounded border border-cardBorder">
          ⌘K
        </div>
      </div>

      <AuthNav />
    </header>
  );
}
