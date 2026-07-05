import React, { useState } from "react";
import { useVektraStore } from "../store/vektraStore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { Sparkles, CreditCard, ShieldCheck, ShoppingBag, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

export default function StorePage() {
  const { credits, addCredits } = useVektraStore();
  const [selectedPack, setSelectedPack] = useState(null); // null or package object
  const [checkoutStep, setCheckoutStep] = useState("idle"); // "idle" | "form" | "processing" | "success"
  
  // Card form states
  const [cardName, setCardName] = useState("Jane Doe");
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");

  const packages = [
    {
      id: "starter",
      name: "Starter Pack",
      credits: 50,
      price: "$10.00",
      description: "Ideal for one-off personal compliance reviews and developer sandbox tests.",
      features: [
        "Unlocks Sarvam AI scan analyzer",
        "Includes 10 high-priority scans",
        "Includes 50 assistant chat messages"
      ],
      popular: false
    },
    {
      id: "dev",
      name: "Developer Pack",
      credits: 250,
      price: "$30.00",
      description: "Best for active engineering teams running daily policy verification scans.",
      features: [
        "Unlocks Sarvam AI scan analyzer",
        "Includes 50 high-priority scans",
        "Includes 250 assistant chat messages",
        "Enables advanced advisor remedies"
      ],
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise Pack",
      credits: 1000,
      price: "$99.00",
      description: "Designed for larger security auditing and compliance management projects.",
      features: [
        "Unlocks Sarvam AI scan analyzer",
        "Includes 200 high-priority scans",
        "Includes 1000 assistant chat messages",
        "Enables advanced advisor remedies",
        "Premium support channels"
      ],
      popular: false
    }
  ];

  const handleOpenCheckout = (pack) => {
    setSelectedPack(pack);
    setCheckoutStep("form");
  };

  const handlePay = (e) => {
    e.preventDefault();
    setCheckoutStep("processing");
    
    // Simulate mock checkout delay
    setTimeout(() => {
      addCredits(selectedPack.credits);
      setCheckoutStep("success");
    }, 2000);
  };

  const handleCloseCheckout = () => {
    setSelectedPack(null);
    setCheckoutStep("idle");
  };

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main View */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TopBar */}
        <TopBar />

        {/* Store Dashboard */}
        <div className="p-8 max-w-5xl mx-auto w-full space-y-8 pb-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2240] pb-6">
            <div>
              <h2 className="font-heading font-bold text-2xl flex items-center gap-2 text-slate-100">
                <Sparkles className="w-6 h-6 text-primary" />
                VEKTRA Credit Store
              </h2>
              <p className="text-xs text-muted mt-1">
                Purchase credits to activate Sarvam AI vulnerability evaluations and remediation advice.
              </p>
            </div>
            {/* Balance Card */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-xl px-4 py-3 flex items-center gap-4 self-start">
              <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-[10px] text-muted uppercase font-bold tracking-wider">AI Credit Balance</div>
                <div className="text-xl font-bold text-slate-200 font-mono mt-0.5">{credits} Credits</div>
              </div>
            </div>
          </div>

          {/* Package Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {packages.map((pack) => (
              <div 
                key={pack.id}
                className={`relative flex flex-col justify-between bg-[#141628] border rounded-2xl p-6 transition-all duration-300 ${
                  pack.popular 
                    ? "border-primary shadow-[0_0_20px_rgba(124,58,237,0.15)] md:-translate-y-2" 
                    : "border-[#1e2240] hover:border-[#2b305e]"
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-primary-light">
                    Most Popular
                  </span>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-heading font-bold text-lg text-slate-200">{pack.name}</h3>
                    <p className="text-xs text-muted mt-1 leading-relaxed min-h-[48px]">{pack.description}</p>
                  </div>

                  <div className="border-b border-[#1e2240] pb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-slate-100 font-mono">{pack.price}</span>
                      <span className="text-xs text-muted">/ one-time</span>
                    </div>
                    <div className="text-xs text-primary font-bold mt-1.5 font-mono">
                      + {pack.credits} Sarvam AI Credits
                    </div>
                  </div>

                  <ul className="space-y-2.5">
                    {pack.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-[#1e2240]">
                  <button
                    onClick={() => handleOpenCheckout(pack)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                      pack.popular 
                        ? "bg-primary hover:bg-primary/80 text-white" 
                        : "bg-[#1e2240] hover:bg-[#2b305e] text-slate-200"
                    }`}
                  >
                    <span>Purchase Package</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Disclaimer */}
          <div className="bg-[#141628]/40 border border-[#1e2240]/40 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-1">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">How credits work</h4>
            <p className="text-xs text-muted leading-relaxed">
              Scanning a policy with full Sarvam AI vulnerability enrichment costs <strong className="text-slate-300 font-mono">5 credits</strong> per run. 
              Sending messages to the interactive security chat assistant consumes <strong className="text-slate-300 font-mono">1 credit</strong> per query. 
              Standard rule/graph visualizations are always free and do not require credits.
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutStep !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#141628] border border-[#1e2240] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {checkoutStep === "form" && (() => {
              const subtotal = selectedPack ? parseFloat(selectedPack.price.replace("$", "")) : 0;
              const platformFee = selectedPack ? parseFloat((subtotal * 0.05 + 0.30).toFixed(2)) : 0;
              const estimatedTax = selectedPack ? parseFloat((subtotal * 0.08).toFixed(2)) : 0;
              const estimatedTotal = (subtotal + platformFee + estimatedTax).toFixed(2);

              return (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div>
                    <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Mock Checkout
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      Confirm your purchase of the <strong className="text-slate-300">{selectedPack?.name}</strong> ({selectedPack?.credits} Credits).
                    </p>
                  </div>

                  {/* Billing Breakdown */}
                  <div className="bg-[#0d0f1a] border border-[#1e2240] rounded-xl p-4 space-y-2 text-xs font-sans">
                    <div className="flex justify-between text-muted">
                      <span>Package Price</span>
                      <span className="font-mono">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Platform Fee (5% + $0.30)</span>
                      <span className="font-mono">${platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Estimated Tax (8%)</span>
                      <span className="font-mono">${estimatedTax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[#1e2240] pt-2 flex justify-between font-bold text-slate-200 text-sm">
                      <span>Estimated Total Cash</span>
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
                        Complete Purchase
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
                  <h4 className="font-heading font-bold text-sm text-slate-200">Processing Payment...</h4>
                  <p className="text-[10px] text-muted mt-0.5">Authorizing transactions via secure mock payment gateway.</p>
                </div>
              </div>
            )}

            {checkoutStep === "success" && (() => {
              const subtotal = selectedPack ? parseFloat(selectedPack.price.replace("$", "")) : 0;
              const platformFee = selectedPack ? parseFloat((subtotal * 0.05 + 0.30).toFixed(2)) : 0;
              const estimatedTax = selectedPack ? parseFloat((subtotal * 0.08).toFixed(2)) : 0;
              const estimatedTotal = (subtotal + platformFee + estimatedTax).toFixed(2);
              
              return (
                <div className="py-8 flex flex-col items-center justify-center space-y-5 text-center animate-in zoom-in-95 duration-300">
                  <div className="bg-safe/10 p-3 rounded-full border border-safe/20">
                    <CheckCircle2 className="w-12 h-12 text-safe animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-lg text-slate-100">Payment Successful!</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed max-w-xs mx-auto">
                      Your mock transaction of <strong className="text-slate-200 font-mono">${estimatedTotal}</strong> has processed correctly. 
                      <strong className="text-safe font-mono block mt-1">+{selectedPack?.credits} Credits Added</strong>
                    </p>
                  </div>
                  <button
                    onClick={handleCloseCheckout}
                    className="bg-safe hover:bg-safe/80 text-white w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                  >
                    Return to Dashboard
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
