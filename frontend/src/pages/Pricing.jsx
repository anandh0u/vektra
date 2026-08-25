import React, { useState } from "react";
import { Check, CreditCard, Loader2, Network, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthNav from "../components/AuthNav";
import { useVektraStore } from "../store/vektraStore";

const plans = [
  { id: "free", name: "Free", price: "₹0", credits: 5, features: ["Deterministic policy analysis", "14 vulnerability classes", "Permission simulator"] },
  { id: "pro", name: "Pro", price: "₹999", credits: 200, featured: true, features: ["AI-assisted explanations", "Remediation drafting", "Extended report history"] },
  { id: "team", name: "Team", price: "₹2,499", credits: 1000, features: ["Shared investigations", "Team authorization", "Compliance workflows"] },
];

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-vektra-razorpay]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.vektraRazorpay = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.head.appendChild(script);
  });
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { currentUser, createPaymentOrder, verifyPayment } = useVektraStore();
  const [paying, setPaying] = useState("");

  const startCheckout = async (plan) => {
    if (!currentUser) {
      navigate("/login", { state: { from: "/pricing" } });
      return;
    }
    if (plan.id === "free") {
      navigate("/dashboard");
      return;
    }
    setPaying(plan.id);
    try {
      const [order] = await Promise.all([createPaymentOrder(plan.id), loadRazorpayCheckout()]);
      const checkout = new window.Razorpay({
        key: order.key_id, amount: order.amount, currency: order.currency,
        name: order.name, description: order.description, order_id: order.order_id,
        prefill: order.prefill, theme: { color: "#3B82F6" },
        handler: async (response) => {
          try {
            await verifyPayment(response);
            toast.success(`${plan.name} activated. Payment verified.`);
            navigate("/wallet");
          } catch (error) { toast.error(error.message); }
          finally { setPaying(""); }
        },
        modal: { ondismiss: () => setPaying("") },
      });
      checkout.on("payment.failed", (response) => {
        toast.error(response?.error?.description || "Payment failed. No credits were added.");
        setPaying("");
      });
      checkout.open();
    } catch (error) {
      toast.error(error.message || "Unable to start checkout.");
      setPaying("");
    }
  };

  return (
    <div className="min-h-screen bg-pageBg text-textMain font-sans">
      <header className="flex h-16 items-center justify-between border-b border-cardBorder bg-[#0B0E14] px-5 md:px-8">
        <button onClick={() => navigate(currentUser ? "/dashboard" : "/")} className="flex items-center gap-2.5 font-bold">
          <span className="rounded-md border border-cardBorder bg-cardSurface p-1.5"><Network className="h-5 w-5 text-primary" /></span>VEKTRA
        </button><AuthNav />
      </header>
      <main className="mx-auto max-w-5xl space-y-10 px-5 py-12 md:px-8 md:py-16">
        <section className="space-y-4 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary"><Shield className="h-3.5 w-3.5" /> Razorpay-secured checkout</div>
          <h1 className="text-3xl font-extrabold">Choose your VEKTRA access level</h1>
          <p className="mx-auto max-w-xl text-sm text-muted">Payments are processed by Razorpay. VEKTRA never receives or stores your card or UPI credentials.</p>
        </section>
        <section className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className={`flex min-h-96 flex-col rounded-xl border p-6 ${plan.featured ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "border-cardBorder bg-cardSurface"}`}>
              <span className="w-fit rounded-full bg-[#1A1F2B] px-2.5 py-1 text-[9px] font-bold uppercase text-muted">{plan.credits} daily credits</span>
              <h2 className="mt-5 text-lg font-bold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-extrabold">{plan.price}<span className="text-xs font-normal text-muted"> / activation</span></p>
              <ul className="mt-6 flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-xs"><Check className="h-4 w-4 shrink-0 text-primary" />{feature}</li>)}</ul>
              <button onClick={() => startCheckout(plan)} disabled={Boolean(paying)} className={`mt-6 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold disabled:opacity-50 ${plan.id === "free" ? "border border-cardBorder" : "bg-primary text-white hover:bg-primary/90"}`}>
                {paying === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{plan.id === "free" ? "Use VEKTRA Free" : `Pay securely for ${plan.name}`}
              </button>
            </article>
          ))}
        </section>
        <p className="text-center text-[11px] text-muted">Paid access is activated only after VEKTRA verifies the Razorpay signature and captured payment on the server.</p>
      </main>
    </div>
  );
}
