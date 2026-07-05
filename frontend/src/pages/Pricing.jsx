import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Network, Shield, X, Loader2 } from "lucide-react";
import AuthNav from "../components/AuthNav";
import { useVektraStore } from "../store/vektraStore";
import toast from "react-hot-toast";

function Feature({ children, locked = false }) {
  const Icon = locked ? X : Check;
  return (
    <li className={`flex items-start gap-2 text-sm ${locked ? "text-muted" : "text-slate-300"}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${locked ? "text-muted" : "text-safe"}`} />
      <span>{children}</span>
    </li>
  );
}

function PricingCard({ plan, annual, currentUser, upgradeWalletPlan }) {
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const price = annual ? plan.annualPrice : plan.monthlyPrice;
  const per = annual ? "/year" : "/month";

  const handleAction = async () => {
    if (plan.name === "Free") {
      navigate("/");
      return;
    }

    if (currentUser) {
      setIsUpgrading(true);
      const myToast = toast.loading(`Initiating Stellar Testnet upgrade to ${plan.name}...`);
      try {
        await upgradeWalletPlan(plan.name.toLowerCase());
        toast.success(`Successfully upgraded to ${plan.name} Tier on Stellar Testnet!`, { id: myToast });
        navigate("/wallet");
      } catch (err) {
        toast.error(err.message || "Failed to complete Stellar upgrade.", { id: myToast });
      } finally {
        setIsUpgrading(false);
      }
    } else {
      navigate(plan.ctaPath);
    }
  };

  const isCurrentPlan = currentUser?.tier?.toLowerCase() === plan.name.toLowerCase();

  return (
    <article className={`relative flex min-h-[560px] flex-col rounded-2xl p-8 ${plan.cardClass}`}>
      <div className="space-y-5 flex-1 flex flex-col justify-between">
        <div className="space-y-5">
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${plan.badgeClass}`}>
            {plan.badge}
          </span>

          <div>
            <h2 className="font-heading text-xl font-bold text-white">{plan.name}</h2>
            <div className="mt-4 flex items-end gap-1">
              <span className={`font-heading text-5xl font-bold ${plan.priceClass || "text-white"}`}>
                {price}
              </span>
              <span className="pb-2 text-sm text-muted">{per}</span>
            </div>
            {annual && plan.monthlyPrice !== "$0" && (
              <p className="mt-2 text-[11px] text-muted">Equivalent to 20% off monthly billing.</p>
            )}
          </div>

          <ul className="space-y-3 pt-2">
            {plan.features.map((feature) => (
              <Feature key={feature.label} locked={feature.locked}>
                {feature.label}
              </Feature>
            ))}
          </ul>
        </div>

        <button
          onClick={handleAction}
          disabled={isUpgrading || isCurrentPlan}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all mt-6 ${
            isCurrentPlan 
              ? "bg-[#1e2240] text-muted cursor-not-allowed border border-[#312e81]/30"
              : plan.ctaClass
          }`}
        >
          {isUpgrading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : (
            plan.cta
          )}
          {!isCurrentPlan && !isUpgrading && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}

export default function PricingPage() {
  const location = useLocation();
  const [annual, setAnnual] = useState(false);
  const { currentUser, upgradeWalletPlan } = useVektraStore();
  const successPlan = new URLSearchParams(location.search).get("success");

  const plans = useMemo(() => [
    {
      name: "Free",
      badge: "Free forever",
      monthlyPrice: "$0",
      annualPrice: "$0",
      cta: "Get started",
      ctaPath: "/",
      cardClass: "bg-[#141628] border border-[#1e2240]",
      badgeClass: "bg-safe/10 text-safe border border-safe/20",
      ctaClass: "border border-primary/50 text-primary hover:bg-primary/10",
      features: [
        { label: "3 scans per day" },
        { label: "14 vulnerability classes" },
        { label: "Basic risk detection" },
        { label: "AI agent analysis", locked: true },
        { label: "Fix generation", locked: true },
        { label: "Scan history", locked: true },
        { label: "Compliance reports", locked: true },
      ],
    },
    {
      name: "Pro",
      badge: "Most Popular",
      monthlyPrice: "$9",
      annualPrice: "$86",
      cta: "Start Pro",
      ctaPath: "/login?plan=pro",
      cardClass: "bg-gradient-to-br from-[#1a0a2e] to-[#0a1628] border-2 border-primary shadow-[0_0_40px_rgba(124,58,237,0.3)] md:-translate-y-4",
      badgeClass: "bg-primary text-white",
      priceClass: "text-primary",
      ctaClass: "bg-gradient-to-r from-primary to-secondary text-white hover:shadow-[0_0_18px_rgba(124,58,237,0.35)]",
      features: [
        { label: "Unlimited scans" },
        { label: "14 vulnerability classes" },
        { label: "Full AI agent analysis" },
        { label: "Auto fix generation" },
        { label: "Risk score + compliance" },
        { label: "Last 50 scans history" },
        { label: "PDF + Markdown export" },
        { label: "Neo4j persistent graph" },
      ],
    },
    {
      name: "Team",
      badge: "For teams",
      monthlyPrice: "$29",
      annualPrice: "$278",
      cta: "Start Team",
      ctaPath: "/login?plan=team",
      cardClass: "bg-[#141628] border border-[#1e2240]",
      badgeClass: "bg-secondary/10 text-secondary border border-secondary/20",
      ctaClass: "bg-gradient-to-r from-secondary to-primary text-white hover:shadow-[0_0_18px_rgba(34,211,238,0.25)]",
      features: [
        { label: "Everything in Pro" },
        { label: "5 team members" },
        { label: "Unlimited scan history" },
        { label: "Shared workspace" },
        { label: "Priority support" },
        { label: "Custom policy templates" },
      ],
    },
  ], []);

  const faqs = [
    {
      q: "Is the free tier really free forever?",
      a: "Yes. No credit card required. 3 scans per day, always free.",
    },
    {
      q: "How does Stellar Testnet integration work?",
      a: "VEKTRA uses Stellar testnet accounts, trustlines, and assets. Each upgrade or token distribution occurs live on-chain, proving access rights with custom NFT tokens.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No contracts, no lock-in.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080f] text-slate-100 font-sans">
      <header className="h-16 border-b border-[#1e2240] bg-[#0a0c16] px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-lg">
            <Network className="w-5 h-5 text-white" />
          </div>
          <span 
            onClick={() => navigate(currentUser ? "/dashboard" : "/")}
            className="font-heading font-bold text-xl tracking-wider bg-gradient-to-r from-white via-slate-200 to-secondary bg-clip-text text-transparent cursor-pointer"
          >
            VEKTRA
          </span>
        </div>
        <AuthNav />
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <section className="text-center space-y-4">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Shield className="h-3.5 w-3.5" />
            Neo4j graph security with Sarvam agents
          </div>
          <h1 className="font-heading text-[40px] font-bold leading-tight text-white">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted">
            Start free. Upgrade when you need the full power.
          </p>

          {successPlan && (
            <div className="mx-auto max-w-md rounded-lg border border-safe/30 bg-safe/10 px-4 py-3 text-sm font-semibold text-safe">
              You are signed up on the {successPlan.toUpperCase()} plan. Your Stellar Testnet assets have been successfully issued!
            </div>
          )}

          <div className="mx-auto mt-6 inline-flex rounded-xl border border-[#1e2240] bg-[#0a0c16] p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-lg px-5 py-2 text-xs font-bold transition-all ${!annual ? "bg-primary text-white" : "text-muted hover:text-slate-200"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-lg px-5 py-2 text-xs font-bold transition-all ${annual ? "bg-primary text-white" : "text-muted hover:text-slate-200"}`}
            >
              Annual (save 20%)
            </button>
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-start">
          {plans.map((plan) => (
            <PricingCard 
              key={plan.name} 
              plan={plan} 
              annual={annual} 
              currentUser={currentUser}
              upgradeWalletPlan={upgradeWalletPlan}
            />
          ))}
        </section>

        <section className="mx-auto mt-16 max-w-3xl space-y-4">
          <h2 className="font-heading text-xl font-bold text-white text-center">FAQ</h2>
          {faqs.map((item) => (
            <div key={item.q} className="rounded-xl border border-[#1e2240] bg-[#141628] p-5">
              <h3 className="text-sm font-bold text-slate-100">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
