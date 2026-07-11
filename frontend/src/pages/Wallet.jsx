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

  const tierMeta = {
    free: {
      label: "FREE",
      desc: "Free Tier Access",
      badgeColor: "bg-muted/10 text-muted border-cardBorder",
      glowColor: "shadow-sm",
      gradient: "from-[#12161F] to-[#0B0E14]",
      icon: Shield,
      transferable: "No"
    },
    pro: {
      label: "PRO",
      desc: "Pro Developer Access",
      badgeColor: "bg-primary/10 text-primary border-primary/20",
      glowColor: "shadow-sm",
      gradient: "from-primary/20 to-cardSurface",
      icon: Award,
      transferable: "Yes"
    },
    team: {
      label: "TEAM",
      desc: "Enterprise Team Access",
      badgeColor: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20",
      glowColor: "shadow-sm",
      gradient: "from-[#22C55E]/20 to-cardSurface",
      icon: Users,
      transferable: "Yes"
    }
  };

  const currentMeta = tierMeta[tier] || tierMeta.free;
  const TierIcon = currentMeta.icon;

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-cardBorder pb-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-textMain uppercase tracking-wider">
                Your VEKTRA Wallet
              </h1>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted font-semibold bg-cardSurface border border-cardBorder px-2.5 py-1 rounded-[6px] flex items-center gap-1.5">
                  {truncatedKey}
                  <button onClick={handleCopy} className="hover:text-primary transition-fast">
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
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
            <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-6 flex flex-col justify-between space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Credits Balance</span>
                  <span className="text-[9px] text-muted block mt-0.5">VEKTRACRED</span>
                </div>
                <span className="text-[10px] text-muted">Resets daily at midnight IST</span>
              </div>

              <div>
                <span className="text-5xl font-extrabold text-primary font-mono block leading-none">
                  {credits}
                </span>
                <div className="w-full bg-pageBg h-2 rounded-full mt-4 overflow-hidden border border-cardBorder">
                  <div 
                    className="bg-primary h-full rounded-full transition-fast" 
                    style={{ width: `${Math.min(100, (credits / totalCredits) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted mt-2 font-medium">
                  <span>{credits} credits left today</span>
                  <span>{totalCredits} credits daily cap</span>
                </div>
              </div>

              {/* Credit cost breakdown */}
              <div className="border-t border-cardBorder pt-4 space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Credits consumption list</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between bg-pageBg px-3 py-1.5 rounded-[6px] border border-cardBorder">
                    <span className="text-textMain font-medium">Full Scan</span>
                    <span className="text-primary font-bold">5 CRED</span>
                  </div>
                  <div className="flex justify-between bg-pageBg px-3 py-1.5 rounded-[6px] border border-cardBorder">
                    <span className="text-textMain font-medium">Basic Scan</span>
                    <span className="text-muted font-bold">1 CRED</span>
                  </div>
                  <div className="flex justify-between bg-pageBg px-3 py-1.5 rounded-[6px] border border-cardBorder">
                    <span className="text-textMain font-medium">Re-run Agents</span>
                    <span className="text-primary font-bold">2 CRED</span>
                  </div>
                  <div className="flex justify-between bg-pageBg px-3 py-1.5 rounded-[6px] border border-cardBorder">
                    <span className="text-textMain font-medium">Export Report</span>
                    <span className="text-muted font-bold">1 CRED</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Card: NFT Display */}
            <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-6 flex flex-col md:flex-row gap-6 items-center">
              
              {/* NFT Graphical representation */}
              <div className={`w-44 h-60 bg-gradient-to-br ${currentMeta.gradient} rounded-[6px] border border-cardBorder p-5 flex flex-col justify-between shrink-0 shadow-sm relative group transition-transform duration-300 hover:rotate-2`}>
                <div className="flex justify-between items-start">
                  <div className="bg-[#12161F] px-2 py-0.5 rounded-[6px] border border-cardBorder text-[8px] font-extrabold uppercase text-slate-200 tracking-wider">
                    VEKTRA PASS
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>

                <div className="flex flex-col items-center py-4">
                  <TierIcon className="w-10 h-10 text-slate-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                  <span className="text-base font-bold text-white mt-2">VEKTRA {currentMeta.label}</span>
                  <span className="text-[8px] font-mono text-muted mt-0.5">Token: VEKTRA{currentMeta.label}</span>
                </div>

                <div className="border-t border-cardBorder pt-2 space-y-1">
                  <span className="text-[8px] font-mono text-muted block">ISSUED BY VEKTRA TREASURY</span>
                  <span className="text-[8px] font-mono text-slate-300 block truncate">{pkey}</span>
                </div>
              </div>

              {/* NFT Metadata details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-textMain uppercase tracking-wide">Your Tier NFT</h3>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">
                    This cryptographic NFT proves your {tier} tier access on-chain.
                  </p>
                </div>

                <div className="space-y-1 text-xs font-semibold text-textMain">
                  <div className="flex justify-between border-b border-cardBorder/30 pb-1">
                    <span className="text-muted font-normal">Transferable:</span>
                    <span>{currentMeta.transferable}</span>
                  </div>
                  <div className="flex justify-between border-b border-cardBorder/30 pb-1">
                    <span className="text-muted font-normal">Minted:</span>
                    <span>{created_at}</span>
                  </div>
                  <div className="flex justify-between border-b border-cardBorder/30 pb-1">
                    <span className="text-muted font-normal">Network:</span>
                    <span className="text-primary font-mono">Stellar Testnet</span>
                  </div>
                </div>

                {!isFree ? (
                  <div className="bg-pageBg border border-cardBorder p-2.5 rounded-[6px] text-[10px] text-muted flex items-center gap-1.5 font-mono">
                    <Lock className="w-3.5 h-3.5 text-muted shrink-0" />
                    Vault Key Locked.
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/pricing")}
                    className="w-full bg-primary hover:bg-primary/95 py-2 rounded-[6px] text-xs font-bold text-white transition-fast border border-primary/20"
                  >
                    Upgrade to Pro Plan
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* Transaction History */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider">On-Chain Transaction History</h2>
            
            {loadingTxs ? (
              <div className="text-xs text-muted py-6 text-center font-mono uppercase tracking-wider">Loading from Stellar Horizon...</div>
            ) : txs.length === 0 ? (
              <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-8 text-center text-xs text-muted">
                No transactions recorded yet on Stellar Testnet for your address.
              </div>
            ) : (
              <div className="bg-cardSurface border border-cardBorder rounded-[6px] overflow-hidden">
                <div className="divide-y divide-cardBorder">
                  {txs.map((tx, idx) => {
                    const isIssued = tx.type === "credits_issued";
                    const isMint = tx.type === "nft_minted";
                    const DateStr = tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "Just now";

                    return (
                      <div key={tx.tx_hash || idx} className="p-4 flex items-center justify-between text-xs font-semibold hover:bg-bgElevated/30 transition-fast">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-[6px] ${
                            isMint 
                              ? "bg-primary/10 text-primary border border-primary/20" 
                              : (isIssued ? "bg-primary/10 text-primary border border-primary/20" : "bg-[#FF5C4D]/10 text-[#FF5C4D] border border-[#FF5C4D]/20")
                          }`}>
                            {isMint ? <Sparkles className="w-4 h-4" /> : (isIssued ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />)}
                          </div>
                          <div>
                            <span className="text-textMain block">
                              {isMint ? "NFT Pass Minted" : (isIssued ? "Credits Received" : "Credits Consumed")}
                            </span>
                            <span className="text-[10px] text-muted block font-mono font-medium truncate max-w-xs">
                              Memo: {tx.memo || "VEKTRA Service execution"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className={`font-mono font-bold block ${isMint ? "text-primary" : (isIssued ? "text-primary" : "text-[#FF5C4D]")}`}>
                              {isMint ? "Pass" : (isIssued ? `+${tx.amount}` : `-${tx.amount}`)}
                            </span>
                            <span className="text-[10px] text-muted block font-medium font-mono">{DateStr}</span>
                          </div>
                          <a 
                            href={tx.stellar_explorer_url || `https://stellar.expert/explorer/testnet/tx/${tx.tx_hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-pageBg rounded-[6px] transition-colors text-muted hover:text-textMain"
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
