import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard, ReceiptText, ShieldCheck } from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useVektraStore } from "../store/vektraStore";

export default function WalletPage() {
  const navigate = useNavigate();
  const { currentUser, fetchWalletTransactions } = useVektraStore();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const tier = (currentUser?.tier || "free").toLowerCase();
  const credits = currentUser?.credits_balance ?? 0;
  const allowance = tier === "team" ? 1000 : tier === "pro" ? 200 : 5;

  useEffect(() => {
    fetchWalletTransactions().then(setTransactions).catch(() => setTransactions([])).finally(() => setLoading(false));
  }, [fetchWalletTransactions]);

  return (
    <div className="flex h-screen overflow-hidden bg-pageBg text-textMain">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-7 overflow-y-auto p-4 sm:p-8">
          <header className="flex flex-col gap-4 border-b border-cardBorder pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Billing & usage</p><h1 className="mt-2 text-2xl font-bold">VEKTRA Account</h1><p className="mt-1 text-xs text-muted">Manage plan access, credits, and verified Razorpay payments.</p></div>
            <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">{tier}</span>
          </header>

          <section className="grid gap-5 md:grid-cols-3">
            <article className="rounded-xl border border-cardBorder bg-cardSurface p-6 md:col-span-2">
              <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Available credits</p><p className="mt-3 font-mono text-5xl font-extrabold text-primary">{credits}</p></div><ShieldCheck className="h-7 w-7 text-primary" /></div>
              <div className="mt-5 h-2 overflow-hidden rounded-full border border-cardBorder bg-pageBg"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (credits / allowance) * 100)}%` }} /></div>
              <div className="mt-2 flex justify-between text-[10px] text-muted"><span>Resets daily at midnight IST</span><span>{allowance} credit allowance</span></div>
            </article>
            <article className="flex flex-col justify-between rounded-xl border border-primary/25 bg-primary/5 p-6">
              <div><CreditCard className="h-6 w-6 text-primary" /><h2 className="mt-4 font-bold">Razorpay billing</h2><p className="mt-2 text-xs leading-relaxed text-muted">Card and UPI details are handled securely by Razorpay, not stored by VEKTRA.</p></div>
              <button onClick={() => navigate("/pricing")} className="mt-6 rounded-lg bg-primary py-2.5 text-xs font-bold text-white">{tier === "free" ? "Upgrade plan" : "Change plan"}</button>
            </article>
          </section>

          <section className="rounded-xl border border-cardBorder bg-cardSurface">
            <div className="flex items-center gap-2 border-b border-cardBorder px-5 py-4"><ReceiptText className="h-4 w-4 text-primary" /><h2 className="text-xs font-bold uppercase tracking-wider">Payment history</h2></div>
            {loading ? <p className="p-8 text-center text-xs text-muted">Loading payment history…</p> : transactions.length === 0 ? <p className="p-8 text-center text-xs text-muted">No Razorpay payments recorded yet.</p> : (
              <div className="divide-y divide-cardBorder">{transactions.map((tx) => <div key={tx.order_id} className="flex flex-col gap-2 px-5 py-4 text-xs sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><CheckCircle2 className={`h-4 w-4 ${tx.status === "paid" ? "text-emerald-400" : "text-muted"}`} /><div><p className="font-semibold">{String(tx.plan || "plan").toUpperCase()} access</p><p className="font-mono text-[10px] text-muted">{tx.order_id}</p></div></div><div className="sm:text-right"><p className="font-mono font-bold">₹{(Number(tx.amount || 0) / 100).toLocaleString("en-IN")}</p><p className="text-[10px] uppercase text-muted">{tx.status}</p></div></div>)}</div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
