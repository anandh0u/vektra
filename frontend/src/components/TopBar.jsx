import React from "react";
import { Search, Bell } from "lucide-react";

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

      {/* User Area */}
      <div className="flex items-center gap-4">
        {/* Alerts Bell */}
        <button className="p-2 text-muted hover:text-slate-200 hover:bg-[#141628] rounded-lg transition-all duration-200 relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-pageBg" />
        </button>

        <div className="h-8 w-px bg-cardBorder" />

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-secondary p-0.5">
            <div className="h-full w-full rounded-md bg-[#0a0c16] flex items-center justify-center font-heading font-bold text-xs text-secondary">
              VK
            </div>
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-200">Security Operator</div>
            <div className="text-[10px] text-muted">Operator Mode</div>
          </div>
        </div>
      </div>
    </header>
  );
}
