import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Network, Shield, X, Loader2 } from "lucide-react";
import AuthNav from "../components/AuthNav";
import { useVektraStore } from "../store/vektraStore";
import toast from "react-hot-toast";

function Feature({ children, locked = false }) {
  const Icon = locked ? X : Check;
  return (
    <li className={`flex items-start gap-2 text-xs ${locked ? "text-muted font-normal" : "text-textMain font-semibold"}`}>
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${locked ? "text-muted" : "text-primary"}`} />
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
    <article className={`relative flex min-h-[500px] flex-col rounded-[6px] p-6 ${plan.cardClass}`}>
      <div className="space-y-5 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${plan.badgeClass}`}>
            {plan.badge}
          </span>

          <div>
            <h2 className="text-sm font-bold text-textMain uppercase tracking-wide">{plan.name}</h2>
            <div className="mt-2 flex items-end gap-1">
              <span className={`text-4xl font-extrabold font-mono tracking-tight ${plan.priceClass || "text-textMain"}`}>
                {price}
              </span>
              <span className="pb-1 text-xs text-muted font-mono">{per}</span>
            </div>
            {annual && plan.monthlyPrice !== "$0" && (
              <p className="mt-1 text-[9px] text-muted font-mono">Equivalent to 20% off monthly billing.</p>
            )}
          </div>

          <ul className="space-y-2.5 pt-2">
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
          className={`flex w-full items-center justify-center gap-1.5 rounded-[6px] py-2 text-xs font-semibold transition-fast mt-6 ${
            isCurrentPlan 
              ? "bg-[#1A1F2B] text-muted cursor-not-allowed border border-cardBorder"
              : plan.ctaClass
          }`}
        >
          {isUpgrading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : (
            plan.cta
          )}
          {!isCurrentPlan && !isUpgrading && <ArrowRight className="h-3.5 w-3.5" />}
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
      cardClass: "bg-cardSurface border border-cardBorder",
      badgeClass: "bg-muted/10 text-muted border border-cardBorder font-mono",
      ctaClass: "border border-cardBorder text-textMain hover:bg-[#1A1F2B]",
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
      cta: "Start Pro Plan",
      ctaPath: "/login?plan=pro",
      cardClass: "bg-cardSurface border-2 border-primary shadow-sm",
      badgeClass: "bg-primary text-white font-mono",
      priceClass: "text-primary",
      ctaClass: "bg-primary hover:bg-primary/95 text-white border border-primary/20",
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
      cta: "Start Team Plan",
      ctaPath: "/login?plan=team",
      cardClass: "bg-cardSurface border border-cardBorder",
      badgeClass: "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 font-mono",
      ctaClass: "bg-cardSurface hover:bg-[#1A1F2B] border border-cardBorder text-textMain",
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

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-pageBg text-textMain font-sans select-none">
      <header className="h-16 border-b border-cardBorder bg-[#0B0E14] px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-cardSurface border border-cardBorder p-1.5 rounded-[6px]">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <span 
            onClick={() => navigate(currentUser ? "/dashboard" : "/")}
            className="font-sans font-bold text-sm tracking-wide text-textMain cursor-pointer"
          >
            VEKTRA
          </span>
        </div>
        <AuthNav />
      </header>

      <main className="mx-auto max-w-5xl px-8 py-16 space-y-12">
        <section className="text-center space-y-4">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary font-mono">
            <Shield className="h-3.5 w-3.5" />
            <span>Secure Consensus Infrastructure</span>
          </div>
          <h1 className="font-sans font-extrabold text-3xl tracking-tight text-textMain leading-tight">
            Transparent Pricing Presets
          </h1>
          <p className="mx-auto max-w-md text-xs text-muted">
            Choose a plan that fits your security scanning scale. Free upgrades occur via Stellar ledger transactions.
          </p>

          {successPlan && (
            <div className="mx-auto max-w-md rounded-[6px] border border-[#22C55E]/30 bg-[#22C55E]/10 px-4 py-2.5 text-xs font-semibold text-[#22C55E] font-mono">
              Successfully upgraded to {successPlan.toUpperCase()} plan. Stellar ledger registry logs successfully synchronized.
            </div>
          )}

          <div className="mx-auto mt-4 inline-flex rounded-[6px] border border-cardBorder bg-[#111113] p-1 font-semibold text-xs">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-[6px] px-4 py-1.5 transition-fast ${!annual ? "bg-activeNav text-textMain border border-cardBorder" : "text-muted hover:text-textMain"}`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-[6px] px-4 py-1.5 transition-fast ${annual ? "bg-activeNav text-textMain border border-cardBorder" : "text-muted hover:text-textMain"}`}
            >
              Annual Billing (Save 20%)
            </button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3 md:items-start max-w-4xl mx-auto w-full">
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

        <section className="mx-auto max-w-2xl space-y-4">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider text-center">Frequently Answered Queries</h2>
          {faqs.map((item) => (
            <div key={item.q} className="rounded-[6px] border border-cardBorder bg-cardSurface p-4 space-y-1">
              <h3 className="text-xs font-bold text-textMain uppercase tracking-wide">{item.q}</h3>
              <p className="text-xs leading-relaxed text-muted font-normal">{item.a}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
