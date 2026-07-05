import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { 
  Shield, 
  Award, 
  Users, 
  Coins, 
  Copy, 
  ExternalLink, 
  Check, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sparkles,
  Lock
} from "lucide-react";
import toast from "react-hot-toast";

export default function WalletPage() {
  const navigate = useNavigate();
  const { currentUser, fetchWalletTransactions } = useVektraStore();
  const [copied, setCopied] = useState(false);
  const [txs, setTxs] = useState([]);
  const [loadingTxs, setLoadingTxs] = useState(true);

  const name = currentUser?.name || "Operator";
  const email = currentUser?.email || "";
  const tier = (currentUser?.tier || "free").toLowerCase();
  const credits = currentUser?.credits_balance ?? 0;
  const pkey = currentUser?.stellar_public_key || "G...";
  const created_at = currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : new Date().toLocaleDateString();

  useEffect(() => {
    setLoadingTxs(true);
    fetchWalletTransactions()
      .then((data) => setTxs(data))
      .catch((err) => console.error("Error loading transactions:", err))
      .finally(() => setLoadingTxs(false));
  }, [fetchWalletTransactions]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pkey);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedKey = pkey.length > 16 
    ? `${pkey.slice(0, 8)}...${pkey.slice(-8)}`
    : pkey;

  const totalCredits = tier === "free" ? 5 : (tier === "pro" ? 200 : 1000);
  const isFree = tier === "free";

  // Tier assets metadata
  const tierMeta = {
    free: {
      label: "FREE",
      desc: "Free Tier Access",
      badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      glowColor: "shadow-[0_0_20px_rgba(100,116,139,0.15)]",
      gradient: "from-[#1e293b] to-[#0f172a]",
      icon: Shield,
      transferable: "No"
    },
    pro: {
      label: "PRO",
      desc: "Pro Developer Access",
      badgeColor: "bg-primary/10 text-primary border-primary/30",
      glowColor: "shadow-[0_0_30px_rgba(124,58,237,0.3)]",
      gradient: "from-[#3b0764] to-[#1e1b4b]",
      icon: Award,
      transferable: "Yes"
    },
    team: {
      label: "TEAM",
      desc: "Enterprise Team Access",
      badgeColor: "bg-secondary/10 text-secondary border-secondary/30",
      glowColor: "shadow-[0_0_30px_rgba(34,211,238,0.3)]",
      gradient: "from-[#083344] to-[#0f172a]",
      icon: Users,
      transferable: "Yes"
    }
  };

  const currentMeta = tierMeta[tier] || tierMeta.free;
  const TierIcon = currentMeta.icon;

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans select-none">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {/* Scrollable container */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1e2240] pb-6">
            <div className="space-y-1">
              <h1 className="font-heading text-2xl font-bold text-slate-100">
                Your VEKTRA Wallet
              </h1>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted font-semibold bg-[#141628] border border-[#1e2240] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  {truncatedKey}
                  <button onClick={handleCopy} className="hover:text-primary transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-safe" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
                <a 
                  href={`https://stellar.expert/explorer/testnet/account/${pkey}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  View on Stellar Explorer <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${currentMeta.badgeColor} ${currentMeta.glowColor}`}>
                <TierIcon className="w-3.5 h-3.5" />
                {currentMeta.label}
              </span>
              <p className="text-[10px] text-muted mt-1.5">Verified on Stellar Testnet</p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Card: Credits Balance */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Credits Balance</span>
                  <span className="text-[9px] text-muted block mt-0.5">VEKTRA_CRED</span>
                </div>
                <span className="text-[10px] text-muted">Resets daily at midnight IST</span>
              </div>

              <div>
                <span className="text-6xl font-heading font-extrabold text-primary font-mono block leading-none">
                  {credits}
                </span>
                <div className="w-full bg-[#0d0f1a] h-2 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (credits / totalCredits) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted mt-2 font-medium">
                  <span>{credits} credits left today</span>
                  <span>{totalCredits} credits daily cap</span>
                </div>
              </div>

              {/* Credit cost breakdown */}
              <div className="border-t border-[#1e2240] pt-4 space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Credits consumption list</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between bg-[#0d0f1a] px-3 py-1.5 rounded-lg border border-[#1e2240]/40">
                    <span className="text-slate-300 font-medium">Full Scan</span>
                    <span className="text-primary font-bold">5 CRED</span>
                  </div>
                  <div className="flex justify-between bg-[#0d0f1a] px-3 py-1.5 rounded-lg border border-[#1e2240]/40">
                    <span className="text-slate-300 font-medium">Basic Scan</span>
                    <span className="text-muted font-bold">1 CRED</span>
                  </div>
                  <div className="flex justify-between bg-[#0d0f1a] px-3 py-1.5 rounded-lg border border-[#1e2240]/40">
                    <span className="text-slate-300 font-medium">Re-run Agents</span>
                    <span className="text-secondary font-bold">2 CRED</span>
                  </div>
                  <div className="flex justify-between bg-[#0d0f1a] px-3 py-1.5 rounded-lg border border-[#1e2240]/40">
                    <span className="text-slate-300 font-medium">Export Report</span>
                    <span className="text-muted font-bold">1 CRED</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Card: NFT Display */}
            <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
              
              {/* NFT Graphical representation */}
              <div className={`w-48 h-64 bg-gradient-to-br ${currentMeta.gradient} rounded-xl border border-primary/20 p-5 flex flex-col justify-between shrink-0 shadow-2xl relative group transition-transform duration-300 hover:rotate-2`}>
                <div className="flex justify-between items-start">
                  <div className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase text-slate-200 tracking-wider">
                    VEKTRA PASS
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>

                <div className="flex flex-col items-center py-4">
                  <TierIcon className="w-12 h-12 text-slate-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                  <span className="text-lg font-heading font-extrabold text-white mt-2">VEKTRA {currentMeta.label}</span>
                  <span className="text-[8px] font-mono text-muted mt-0.5">Token: VEKTRA_{currentMeta.label}</span>
                </div>

                <div className="border-t border-white/10 pt-2 space-y-1">
                  <span className="text-[8px] font-mono text-muted block">ISSUED BY VEKTRA TREASURY</span>
                  <span className="text-[8px] font-mono text-slate-300 block truncate">{pkey}</span>
                </div>
              </div>

              {/* NFT Metadata details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Your Tier NFT</h3>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">
                    This cryptographic NFT proves your {tier} tier access on-chain.
                  </p>
                </div>

                <div className="space-y-1 text-xs font-semibold text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-muted">Transferable:</span>
                    <span>{currentMeta.transferable}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Minted:</span>
                    <span>{created_at}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Network:</span>
                    <span className="text-primary">Stellar Testnet</span>
                  </div>
                </div>

                {!isFree ? (
                  <div className="bg-[#0d0f1a] border border-[#1e2240] p-2.5 rounded-lg text-[10px] text-muted flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-muted shrink-0" />
                    NFT keys are locked under your Neo4j vault keys.
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/pricing")}
                    className="w-full bg-gradient-to-r from-primary to-secondary py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-[0_0_12px_rgba(124,58,237,0.35)]"
                  >
                    Upgrade to Pro →
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* Transaction History */}
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-slate-100">Transaction History</h2>
            
            {loadingTxs ? (
              <div className="text-xs text-muted py-6 text-center">Loading transactions from Stellar Horizon...</div>
            ) : txs.length === 0 ? (
              <div className="bg-[#141628]/40 border border-[#1e2240] rounded-2xl p-8 text-center text-xs text-muted">
                No transactions recorded yet on Stellar Testnet for your address.
              </div>
            ) : (
              <div className="bg-[#141628] border border-[#1e2240] rounded-2xl overflow-hidden">
                <div className="divide-y divide-[#1e2240]">
                  {txs.map((tx, idx) => {
                    const isIssued = tx.type === "credits_issued";
                    const isMint = tx.type === "nft_minted";
                    const DateStr = tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "Just now";

                    return (
                      <div key={tx.tx_hash || idx} className="p-4 flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isMint 
                              ? "bg-primary/10 text-primary border border-primary/20" 
                              : (isIssued ? "bg-safe/10 text-safe border border-safe/20" : "bg-danger/10 text-danger border border-danger/20")
                          }`}>
                            {isMint ? <Sparkles className="w-4 h-4" /> : (isIssued ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />)}
                          </div>
                          <div>
                            <span className="text-slate-200 block">
                              {isMint ? "NFT Pass Minted" : (isIssued ? "Credits Received" : "Credits Consumed")}
                            </span>
                            <span className="text-[10px] text-muted block font-mono font-medium truncate max-w-xs">
                              Memo: {tx.memo || "VEKTRA Service execution"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className={`font-mono font-bold block ${isMint ? "text-primary" : (isIssued ? "text-safe" : "text-danger")}`}>
                              {isMint ? "Pass" : (isIssued ? `+${tx.amount}` : `-${tx.amount}`)}
                            </span>
                            <span className="text-[10px] text-muted block font-medium">{DateStr}</span>
                          </div>
                          <a 
                            href={tx.stellar_explorer_url || `https://stellar.expert/explorer/testnet/tx/${tx.tx_hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-[#0d0f1a] rounded transition-colors text-muted hover:text-white"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
