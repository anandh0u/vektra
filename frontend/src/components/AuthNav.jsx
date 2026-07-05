import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ChevronDown, 
  LogOut, 
  Settings, 
  User, 
  Mail, 
  Home, 
  Gem, 
  History as HistoryIcon,
  Bell
} from "lucide-react";
import { useVektraStore } from "../store/vektraStore";

export default function AuthNav() {
  const navigate = useNavigate();
  const { currentUser, signOut } = useVektraStore();
  const [open, setOpen] = useState(false);

  const credits = currentUser?.credits_balance ?? 0;
  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleSignOut = () => {
    signOut();
    setOpen(false);
    navigate("/");
  };

  if (!currentUser) {
    return (
      <div className="flex items-center gap-3">
        <Link
          to="/pricing"
          className="hidden sm:inline-flex h-9 items-center px-3 text-xs font-semibold text-muted hover:text-slate-200 transition-colors"
        >
          Pricing
        </Link>
        <Link
          to="/login"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
        >
          Sign in
        </Link>
        <Link
          to="/pricing"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-3.5 py-1.5 text-xs font-bold text-white hover:shadow-[0_0_16px_rgba(124,58,237,0.35)] transition-all"
        >
          Start free
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Credits Chip */}
      <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-xs font-bold text-primary font-mono">
        💎 {credits}
      </span>

      {/* Notification Bell */}
      <button 
        className="p-1.5 rounded-lg border border-[#1e2240] hover:bg-[#141628] transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-muted hover:text-white transition-colors" />
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
      </button>

      {/* Dropdown User Button */}
      <div className="relative">
        <button
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-lg border border-[#1e2240] bg-[#141628] px-2 py-2 hover:border-primary/40 transition-all"
        >
          <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xs text-primary shadow-[0_0_10px_rgba(124,58,237,0.15)]">
            {initials}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-11 z-50 w-52 rounded-2xl border border-[#1e2240] bg-[#0a0c16] p-2 shadow-2xl space-y-1.5">
            {/* Header info */}
            <div className="px-3 py-2 border-b border-[#1e2240] space-y-0.5">
              <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted" />
                {currentUser.name || "Operator"}
              </span>
              <span className="text-[10px] text-muted block font-mono truncate">
                {currentUser.email}
              </span>
            </div>

            {/* Links */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/dashboard");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-[#141628] transition-colors"
              >
                <Home className="w-3.5 h-3.5 text-muted" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/wallet");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-[#141628] transition-colors"
              >
                <Gem className="w-3.5 h-3.5 text-muted" />
                Wallet
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/history");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-[#141628] transition-colors"
              >
                <HistoryIcon className="w-3.5 h-3.5 text-muted" />
                History
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/settings");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-[#141628] transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-muted" />
                Settings
              </button>
            </div>

            <div className="border-t border-[#1e2240] pt-1.5">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
