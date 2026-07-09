import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import { ArrowRight, Lock, Mail, Network, User, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn } = useVektraStore();
  const plan = new URLSearchParams(location.search).get("plan");
  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "";

  const [isSignUp, setIsSignUp] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectAfterAuth = () => {
    if (plan) {
      navigate(`/pricing?success=${plan}`);
      return;
    }
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (isSignUp && !name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!email.includes("@")) {
      setErrorMsg("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
      redirectAfterAuth();
    } catch (error) {
      setErrorMsg(error.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-pageBg text-textMain flex flex-col md:flex-row font-sans select-none overflow-y-auto">
      
      {/* Information Panel */}
      <div className="md:w-1/2 bg-sidebarBg border-r border-cardBorder flex flex-col justify-between p-8 md:p-16 relative overflow-hidden">
        <div className="flex items-center gap-2.5 z-10">
          <div className="bg-cardSurface border border-cardBorder p-2 rounded-[6px]">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <span className="font-sans font-bold text-sm tracking-wide text-textMain">
            VEKTRA
          </span>
        </div>

        <div className="my-auto py-12 space-y-8 z-10 max-w-lg">
          <div className="space-y-4">
            <h1 className="font-sans font-extrabold text-3xl md:text-4xl leading-tight text-textMain tracking-tight">
              Access Governance.<br />
              <span className="text-primary font-semibold">Secure consensual ledger mapping.</span>
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              Unregistered scans run in basic mode. Creating an operator profile synchronizes relationship caches on our Neo4j engine and registers active credit tokens on the Stellar Testnet ledger.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-cardBorder pt-8">
            <div className="bg-cardSurface border border-cardBorder p-4 rounded-[6px] text-center space-y-1">
              <div className="text-xl font-bold font-mono text-primary">14</div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-wider font-mono">Violations</div>
            </div>
            <div className="bg-cardSurface border border-cardBorder p-4 rounded-[6px] text-center space-y-1">
              <div className="text-xl font-bold font-mono text-primary">3</div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-wider font-mono">AI Analysts</div>
            </div>
            <div className="bg-cardSurface border border-cardBorder p-4 rounded-[6px] text-center space-y-1">
              <div className="text-xl font-bold font-mono text-primary">0</div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-wider font-mono">Cards Required</div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-muted font-mono z-10">
          VEKTRA WORKSPACE SECURITY CONSOLE • ACTIVE TESTNET ACCESS
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-16 relative">
        <div className="max-w-md w-full bg-cardSurface border border-cardBorder rounded-[6px] p-8 shadow-sm z-10 space-y-6">
          {plan && (
            <div className="rounded-[6px] border border-primary/20 bg-primary/5 px-4 py-2 text-center text-xs font-semibold text-primary font-mono">
              PRE-REGISTERING: {planLabel.toUpperCase()} WORKSPACE
            </div>
          )}

          <div className="text-center space-y-1">
            <h2 className="font-sans font-bold text-sm text-textMain uppercase tracking-wider">
              {isSignUp ? "Register Account" : "Access Workspace"}
            </h2>
            <p className="text-[10px] text-muted font-normal">
              Operators receive credentials via session JWT parameters.
            </p>
          </div>

          <div className="flex bg-pageBg p-1 rounded-[6px] border border-cardBorder">
            <button
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg("");
              }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold tracking-wide transition-fast ${
                isSignUp ? "bg-activeNav text-textMain border border-cardBorder" : "text-muted hover:text-textMain"
              }`}
            >
              Register
            </button>
            <button
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg("");
              }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold tracking-wide transition-fast ${
                !isSignUp ? "bg-activeNav text-textMain border border-cardBorder" : "text-muted hover:text-textMain"
              }`}
            >
              Sign In
            </button>
          </div>

          {errorMsg && (
            <div className="bg-[#FF5C4D]/10 border border-[#FF5C4D]/25 rounded-[6px] p-2.5 text-xs text-[#FF5C4D] text-center font-mono">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Security Operator"
                    className="w-full bg-pageBg border border-cardBorder rounded-[6px] pl-9 pr-4 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-pageBg border border-cardBorder rounded-[6px] pl-9 pr-4 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-pageBg border border-cardBorder rounded-[6px] pl-9 pr-4 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white rounded-[6px] text-xs font-semibold transition-fast flex items-center justify-center gap-1.5 border border-primary/20"
            >
              <span>{isSubmitting ? "Syncing session..." : (isSignUp ? "Complete Registration" : "Enter Console")}</span>
              {!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          <div className="space-y-2 border-t border-cardBorder pt-4 text-center">
            <button
              onClick={() => navigate("/")}
              className="w-full h-9 rounded-[6px] border border-cardBorder text-xs font-bold text-muted hover:text-textMain hover:bg-[#1A1F2B] transition-fast"
            >
              Continue Free Tier Access
            </button>
            <p className="text-[10px] text-muted font-normal">
              3 scans daily allowance · Free sandbox mode
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
