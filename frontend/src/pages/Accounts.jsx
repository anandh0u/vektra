import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { Shield, Plus, CheckCircle, RefreshCw, Key, AlertTriangle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

const INITIAL_ACCOUNTS = [
  {
    id: "aws-prod-1",
    name: "Production Workspace",
    accountId: "111122223333",
    status: "Healthy",
    regions: "us-east-1, us-west-2",
    usersCount: 42,
    rolesCount: 28,
    lastScanned: "2 hours ago",
    score: 84
  },
  {
    id: "aws-dev-2",
    name: "Staging sandbox",
    accountId: "444455556666",
    status: "Warning",
    regions: "us-east-1",
    usersCount: 18,
    rolesCount: 15,
    lastScanned: "Yesterday",
    score: 62
  }
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [showModal, setShowModal] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccId, setNewAccId] = useState("");
  const [roleArn, setRoleArn] = useState("");

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccId.trim() || !roleArn.trim()) {
      toast.error("Please fill in all connection details.");
      return;
    }
    
    if (newAccId.length !== 12 || !/^\d+$/.test(newAccId)) {
      toast.error("AWS Account ID must be a 12-digit number.");
      return;
    }

    const newAccount = {
      id: `aws-custom-${Date.now()}`,
      name: newAccName,
      accountId: newAccId,
      status: "Healthy",
      regions: "us-east-1",
      usersCount: 0,
      rolesCount: 0,
      lastScanned: "Never",
      score: 100
    };

    setAccounts([...accounts, newAccount]);
    setShowModal(false);
    setNewAccName("");
    setNewAccId("");
    setRoleArn("");
    toast.success("AWS Account connected successfully via Cross-Account Role!");
  };

  const handleSync = (name) => {
    const syncToast = toast.loading(`Synchronizing metadata from AWS for ${name}...`);
    setTimeout(() => {
      toast.success(`Metadata sync complete for ${name}`, { id: syncToast });
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-textMain flex items-center gap-2 uppercase tracking-tight">
                  <Shield className="h-5 w-5 text-primary" />
                  AWS Connected Accounts
                </h1>
                <p className="mt-0.5 text-xs text-muted">
                  Manage cross-account IAM role integrations and synchronization triggers.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="h-9 px-4 bg-primary hover:bg-primary/90 text-white rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-fast shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Connect AWS Account
              </button>
            </div>

            {/* Grid Accounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accounts.map((acc) => (
                <div key={acc.id} className="glass-card rounded-lg p-5 space-y-4 hover:border-primary/20 transition-fast flex flex-col justify-between">
                  <div className="space-y-3.5">
                    
                    {/* Title and Badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-textMain">{acc.name}</h2>
                        <span className="text-[10px] font-mono text-muted block mt-0.5">Account ID: {acc.accountId}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-[6px] text-[8px] font-bold border uppercase tracking-wider font-mono ${
                        acc.status === "Healthy"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-warning/10 text-warning border-warning/20"
                      }`}>
                        {acc.status}
                      </span>
                    </div>

                    {/* Stats List */}
                    <div className="grid grid-cols-2 gap-4 border-t border-cardBorder/40 pt-4 text-xs font-semibold text-textMain">
                      <div>
                        <span className="text-muted block text-[9px] uppercase tracking-wider font-mono">Monitored Regions</span>
                        <span className="mt-0.5 block">{acc.regions}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[9px] uppercase tracking-wider font-mono">Last Scanned</span>
                        <span className="mt-0.5 block font-mono">{acc.lastScanned}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[9px] uppercase tracking-wider font-mono">IAM Users / Roles</span>
                        <span className="mt-0.5 block font-mono">{acc.usersCount} users, {acc.rolesCount} roles</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[9px] uppercase tracking-wider font-mono">Security Score</span>
                        <span className={`mt-0.5 block font-mono ${acc.score >= 80 ? "text-primary" : "text-warning"}`}>
                          {acc.score}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-cardBorder/40 pt-4 mt-2 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-muted flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      Role: arn:aws:iam::{acc.accountId}:role/VektraScanner
                    </span>
                    <button
                      onClick={() => handleSync(acc.name)}
                      className="bg-cardSurface hover:bg-bgElevated text-muted hover:text-textMain border border-cardBorder px-2.5 py-1.5 rounded-[6px] text-[10px] font-bold transition-fast flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3 text-primary" />
                      Sync Now
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mock instructions info */}
            <div className="glass-card rounded-lg p-5 space-y-3.5">
              <h3 className="text-xs font-bold text-textMain uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Cross-Account Setup Reference Guide
              </h3>
              <p className="text-xs text-muted leading-relaxed font-normal">
                Vektra connects securely using AWS Cross-Account Trust Roles. We do not require static access keys. Create a role in your target AWS console using Vektra's operator external ID parameter, then attach the <code className="bg-pageBg border border-cardBorder px-1 py-0.5 rounded-[6px] font-mono text-[10px] text-primary">SecurityAudit</code> read-only permission policy.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Add Account */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-lg max-w-md w-full p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-textMain uppercase tracking-wider">Connect AWS Account</h2>
              <p className="text-xs text-muted mt-0.5">Integrate AWS permissions metadata securely.</p>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Account Friendly Name</label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. AWS Production Sandbox"
                  className="w-full bg-pageBg border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">AWS Account ID (12 Digits)</label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={newAccId}
                  onChange={(e) => setNewAccId(e.target.value)}
                  placeholder="123456789012"
                  className="w-full bg-pageBg border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Target Cross-Account Role ARN</label>
                <input
                  type="text"
                  required
                  value={roleArn}
                  onChange={(e) => setRoleArn(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/VektraScanner"
                  className="w-full bg-pageBg border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 h-10 bg-primary hover:bg-primary/95 text-white font-semibold rounded-[6px] text-xs transition-fast"
                >
                  Save Integration
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-10 bg-cardSurface hover:bg-bgElevated border border-cardBorder text-textMain font-semibold rounded-[6px] text-xs transition-fast"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
