import React from "react";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UpgradePrompt() {
  const navigate = useNavigate();
  const features = [
    "Vulnerability Analyst agent",
    "Fix Engineer agent",
    "Risk Scorer agent",
    "Compliance reports",
    "Persistent scan history",
  ];

  return (
    <div className="rounded-xl border border-primary/50 bg-[#141628] p-4 shadow-[0_0_24px_rgba(124,58,237,0.22)] text-center space-y-4">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 border border-primary/30 text-primary">
        <LockKeyhole className="w-5 h-5" />
      </div>

      <div className="space-y-1">
        <h4 className="font-heading text-base font-bold text-slate-100">
          AI Analysis locked on Free tier
        </h4>
        <p className="text-[13px] text-muted">
          Upgrade to Pro to unlock:
        </p>
      </div>

      <ul className="space-y-2 text-left">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-slate-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => navigate("/pricing")}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary py-2.5 text-xs font-bold text-white transition-all hover:shadow-[0_0_18px_rgba(124,58,237,0.35)]"
      >
        Upgrade to Pro - $9/mo
        <ArrowRight className="h-4 w-4" />
      </button>

      <button
        onClick={() => navigate("/login")}
        className="text-xs text-muted hover:text-slate-300 transition-colors"
      >
        or Sign in if you have an account
      </button>
    </div>
  );
}
