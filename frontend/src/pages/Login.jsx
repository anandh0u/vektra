import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import { ArrowRight, Lock, Mail, Shield, UserPlus, User } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { authMode, setAuthMode, signup, login } = useVektraStore();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const isSignup = authMode !== "login";

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const submit = (event) => {
    event.preventDefault();
    try {
      if (isSignup) {
        signup(form);
      } else {
        login(form);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-slate-100 flex">
      <section className="hidden lg:flex flex-1 relative overflow-hidden border-r border-[#1e2240]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.22),transparent_30%),radial-gradient(circle_at_70%_60%,rgba(6,182,212,0.16),transparent_34%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-bold text-2xl tracking-wider">VEKTRA</span>
          </div>
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Lock className="w-3.5 h-3.5" />
              Private demo workspace
            </div>
            <h1 className="font-heading text-5xl font-bold leading-tight">
              Start with a clean security workspace.
            </h1>
            <p className="text-sm leading-7 text-slate-300 max-w-xl">
              Create an account, upload your own AWS IAM or Kubernetes RBAC policy, and run VEKTRA's graph analyzer without preloaded dummy results.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-muted">
            <div className="rounded-xl border border-[#1e2240] bg-[#141628]/60 p-4">
              <div className="font-heading text-lg text-white">14</div>
              Vulnerability classes
            </div>
            <div className="rounded-xl border border-[#1e2240] bg-[#141628]/60 p-4">
              <div className="font-heading text-lg text-white">3</div>
              Agent outputs
            </div>
            <div className="rounded-xl border border-[#1e2240] bg-[#141628]/60 p-4">
              <div className="font-heading text-lg text-white">0</div>
              Dummy scans
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-bold text-2xl tracking-wider">VEKTRA</span>
          </div>

          <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-6 shadow-2xl">
            <div className="flex rounded-xl bg-[#0a0c16] border border-[#1e2240] p-1 mb-6">
              <button
                onClick={() => setAuthMode("signup")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  isSignup ? "bg-primary text-white" : "text-muted hover:text-slate-200"
                }`}
              >
                Create account
              </button>
              <button
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  !isSignup ? "bg-primary text-white" : "text-muted hover:text-slate-200"
                }`}
              >
                Sign in
              </button>
            </div>

            <div className="space-y-1 mb-6">
              <h2 className="font-heading text-2xl font-bold text-white">
                {isSignup ? "Create your VEKTRA account" : "Welcome back"}
              </h2>
              <p className="text-xs text-muted">
                {isSignup
                  ? "Your account is stored locally for this demo workspace."
                  : "Sign in to continue your local VEKTRA workspace."}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {isSignup && (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Name</span>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      value={form.name}
                      onChange={(event) => update("name", event.target.value)}
                      className="w-full rounded-xl border border-[#1e2240] bg-[#0d0f1a] py-3 pl-10 pr-3 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none"
                      placeholder="Security Operator"
                    />
                  </div>
                </label>
              )}

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    className="w-full rounded-xl border border-[#1e2240] bg-[#0d0f1a] py-3 pl-10 pr-3 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Password</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    className="w-full rounded-xl border border-[#1e2240] bg-[#0d0f1a] py-3 pl-10 pr-3 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </label>

              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-heading font-semibold text-sm flex items-center justify-center gap-2"
              >
                {isSignup ? <UserPlus className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                {isSignup ? "Create account" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
