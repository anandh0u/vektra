import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Network, Shield, X, Loader2, CreditCard, CheckCircle2 } from "lucide-react";
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

function PricingCard({ plan, annual, currentUser, onOpenCheckout }) {
  const navigate = useNavigate();
  const price = annual ? plan.annualPrice : plan.monthlyPrice;
  const per = annual ? "/year" : "/month";

  const handleAction = () => {
    if (plan.name === "Free") {
      navigate("/");
      return;
    }

    if (currentUser) {
      onOpenCheckout({
        ...plan,
        currentPrice: parseFloat(price.replace("$", "")),
        billingPeriod: annual ? "year" : "month"
      });
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
          disabled={isCurrentPlan}
          className={`flex w-full items-center justify-center gap-1.5 rounded-[6px] py-2 text-xs font-semibold transition-fast mt-6 ${
            isCurrentPlan 
              ? "bg-[#1A1F2B] text-muted cursor-not-allowed border border-cardBorder"
              : plan.ctaClass
          }`}
        >
          {isCurrentPlan ? (
            "Current Plan"
          ) : (
            plan.cta
          )}
          {!isCurrentPlan && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </article>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [annual, setAnnual] = useState(false);
  const { currentUser, upgradeWalletPlan } = useVektraStore();
  const successPlan = new URLSearchParams(location.search).get("success");

  // Checkout modal states
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState("idle"); // "idle" | "form" | "processing" | "success"
  const [cardName, setCardName] = useState("Jane Doe");
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");

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

  const handleOpenCheckout = (planInfo) => {
    setSelectedPlan(planInfo);
    setCheckoutStep("form");
  };

  const handleCloseCheckout = () => {
    const wasSuccess = checkoutStep === "success";
    setSelectedPlan(null);
    setCheckoutStep("idle");
    if (wasSuccess) {
      navigate("/wallet");
    }
  };

  const handlePay = (e) => {
    e.preventDefault();
    setCheckoutStep("processing");

    setTimeout(async () => {
      try {
        await upgradeWalletPlan(selectedPlan.name.toLowerCase());
        setCheckoutStep("success");
      } catch (err) {
        toast.error(err.message || "Failed to complete Stellar upgrade.");
        setCheckoutStep("form");
      }
    }, 2000);
  };

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
              onOpenCheckout={handleOpenCheckout}
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

      {/* Subscription Checkout Modal */}
      {checkoutStep !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#141628] border border-[#1e2240] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {checkoutStep === "form" && (() => {
              const subtotal = selectedPlan ? selectedPlan.currentPrice : 0;
              const platformFee = selectedPlan ? parseFloat((subtotal * 0.05 + 0.30).toFixed(2)) : 0;
              const gstTax = selectedPlan ? parseFloat((subtotal * 0.18).toFixed(2)) : 0; // 18% GST
              const estimatedTotal = (subtotal + platformFee + gstTax).toFixed(2);

              return (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div>
                    <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Upgrade Plan Checkout
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      Confirm subscription upgrade to <strong className="text-slate-300">VEKTRA {selectedPlan?.name}</strong> billed per {selectedPlan?.billingPeriod}.
                    </p>
                  </div>

                  {/* Billing Breakdown */}
                  <div className="bg-[#0d0f1a] border border-[#1e2240] rounded-xl p-4 space-y-2 text-xs font-sans text-slate-300">
                    <div className="flex justify-between text-muted">
                      <span>Plan Subscription Fee</span>
                      <span className="font-mono">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Platform Service Fee (5% + $0.30)</span>
                      <span className="font-mono">${platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>GST (18% Goods & Services Tax)</span>
                      <span className="font-mono">${gstTax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[#1e2240] pt-2 flex justify-between font-bold text-slate-200 text-sm">
                      <span>Total Estimated Cost</span>
                      <span className="font-mono text-primary">${estimatedTotal}</span>
                    </div>
                  </div>

                  <form onSubmit={handlePay} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Cardholder Name</label>
                      <input 
                        type="text" 
                        required
                        value={cardName} 
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Card Number</label>
                      <input 
                        type="text" 
                        required
                        value={cardNumber} 
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Expiration Date</label>
                        <input 
                          type="text" 
                          required
                          value={cardExpiry} 
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">CVC</label>
                        <input 
                          type="password" 
                          required
                          maxLength="3"
                          value={cardCvc} 
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="123"
                          className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-all duration-200 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCloseCheckout}
                        className="flex-1 bg-[#1e2240] hover:bg-[#2b305e] text-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-primary hover:bg-primary/80 text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                      >
                        Complete Upgrade
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}

            {checkoutStep === "processing" && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div>
                  <h4 className="font-heading font-bold text-sm text-slate-200">Registering Subscription on Ledger...</h4>
                  <p className="text-[10px] text-muted mt-0.5 font-normal">Minting non-fungible subscription certificate on Stellar consensus chain.</p>
                </div>
              </div>
            )}

            {checkoutStep === "success" && (() => {
              const subtotal = selectedPlan ? selectedPlan.currentPrice : 0;
              const platformFee = selectedPlan ? parseFloat((subtotal * 0.05 + 0.30).toFixed(2)) : 0;
              const gstTax = selectedPlan ? parseFloat((subtotal * 0.18).toFixed(2)) : 0;
              const estimatedTotal = (subtotal + platformFee + gstTax).toFixed(2);
              
              return (
                <div className="py-8 flex flex-col items-center justify-center space-y-5 text-center animate-in zoom-in-95 duration-300">
                  <div className="bg-safe/10 p-3 rounded-full border border-safe/20">
                    <CheckCircle2 className="w-12 h-12 text-safe animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-lg text-slate-100">Upgrade Successful!</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed max-w-xs mx-auto font-normal">
                      Your subscription payment of <strong className="text-slate-200 font-mono">${estimatedTotal}</strong> was authorized. 
                      <strong className="text-safe font-mono block mt-1">Stellar NFT Certificate Minted & Synced</strong>
                    </p>
                  </div>
                  <button
                    onClick={handleCloseCheckout}
                    className="bg-safe hover:bg-safe/80 text-white w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                  >
                    Go to Wallet Console
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
