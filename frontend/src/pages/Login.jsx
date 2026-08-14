import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, Mail, Network, ShieldCheck, User } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn } = useVektraStore();
  const searchParams = new URLSearchParams(location.search);
  const plan = searchParams.get("plan");
  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "";

  const [isSignUp, setIsSignUp] = useState(() => Boolean(plan) || searchParams.get("mode") === "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectAfterAuth = () => {
    if (plan) {
      navigate(`/pricing?success=${plan}`);
      return;
    }
    navigate("/dashboard", { replace: true });
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
    if (isSignUp && password.length < 12) {
      setErrorMsg("Password must be at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(name.trim(), email.trim().toLowerCase(), password);
      } else {
        await signIn(email.trim().toLowerCase(), password);
      }
      redirectAfterAuth();
    } catch (error) {
      setErrorMsg(error.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-pageBg text-textMain flex flex-col lg:flex-row font-sans overflow-y-auto">
      {/* Information Panel */}
      <div className="lg:w-1/2 bg-cardSurface border-b lg:border-b-0 lg:border-r border-cardBorder flex flex-col justify-between p-6 sm:p-10 lg:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_30%)]" />
        <div className="flex items-center gap-2.5 z-10">
          <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <Network className="w-6 h-6 text-white" />
          </div>
          <span className="font-heading font-bold text-2xl tracking-wider bg-gradient-to-r from-white via-slate-200 to-secondary bg-clip-text text-transparent">
            VEKTRA
          </span>
        </div>

        <div className="my-auto py-12 space-y-8 z-10 max-w-lg">
          <div className="space-y-4">
            <h1 className="font-heading font-bold text-3xl md:text-4xl leading-tight text-textMain">
              Secure your graph, <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                then unlock the agents.
              </span>
            </h1>
            <p className="text-xs text-muted leading-relaxed font-sans">
              Free scans stay open to everyone. Accounts add usage tracking, Neo4j-backed history, and paid-tier AI enrichment for deeper security review.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-[#1e2240]/60 pt-8">
            <div className="bg-bgElevated border border-cardBorder p-4 rounded-xl text-center space-y-1">
              <div className="text-xl font-bold font-mono text-primary">14</div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Vulnerability classes</div>
            </div>
            <div className="bg-bgElevated border border-cardBorder p-4 rounded-xl text-center space-y-1">
              <div className="text-xl font-bold font-mono text-secondary">3</div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-wider">AI agents on Pro</div>
            </div>
            <div className="bg-bgElevated border border-cardBorder p-4 rounded-xl text-center space-y-1">
              <div className="text-xl font-bold font-mono text-safe">0</div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Credit card needed</div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-muted/60 font-mono z-10">
          VEKTRA Security Platform © 2026. Protected workspace environment.
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-16 relative">
        <div className="max-w-md w-full vektra-surface p-6 sm:p-8 z-10 space-y-6">
          {plan && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-center text-xs font-bold text-primary">
              You're signing up for VEKTRA {planLabel}
            </div>
          )}

          <div className="text-center space-y-1">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <h2 className="font-heading font-bold text-xl text-textMain">
              {isSignUp ? "Create your VEKTRA account" : "Sign in to your workspace"}
            </h2>
            <p className="text-[10px] text-muted">
              Accounts are backed by Neo4j and secured with JWT sessions.
            </p>
          </div>

          <div className="flex bg-bgElevated p-1 rounded-xl border border-cardBorder">
            <button
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg("");
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 ${
                isSignUp ? "bg-primary text-white shadow-md" : "text-muted hover:text-slate-200"
              }`}
            >
              Create account
            </button>
            <button
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg("");
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 ${
                !isSignUp ? "bg-primary text-white shadow-md" : "text-muted hover:text-slate-200"
              }`}
            >
              Sign in
            </button>
          </div>

          {errorMsg && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-xs text-danger text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Security Operator"
                    className="w-full bg-pageBg border border-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-pageBg border border-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={isSignUp ? 12 : undefined}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Minimum 12 characters" : "Password"}
                  className="w-full bg-pageBg border border-cardBorder rounded-xl pl-10 pr-11 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-textMain"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isSignUp && (
                <p className={`flex items-center gap-1.5 text-[10px] ${password.length >= 12 ? "text-safe" : "text-muted"}`}>
                  <Check className="h-3 w-3" /> Use at least 12 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/80 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
            >
              <span>{isSubmitting ? "Securing session..." : (isSignUp ? "Create account" : "Sign in")}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="space-y-2 border-t border-cardBorder pt-4">
            <button
              onClick={() => navigate("/")}
              className="w-full rounded-xl border border-cardBorder py-2.5 text-xs font-bold text-muted hover:text-textMain hover:bg-bgElevated transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Continue with free tier
            </button>
            <p className="text-center text-[10px] text-muted">
              3 free scans per day, no AI agents
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
