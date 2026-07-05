import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useVektraStore } from "../store/vektraStore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { 
  User, 
  Lock, 
  Wallet, 
  Bell, 
  Trash2, 
  ChevronRight, 
  Check, 
  ShieldAlert,
  Copy
} from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    updateProfile, 
    changePassword, 
    updateNotifications, 
    deleteAccount 
  } = useVektraStore();

  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "security" | "wallet" | "notifications" | "danger"

  // ── PROFILE STATE ──
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── SECURITY STATE ──
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [updatingPw, setUpdatingPw] = useState(false);

  // ── NOTIFICATIONS STATE ──
  const parsedPrefs = (() => {
    try {
      return JSON.parse(currentUser?.notification_preferences || "{}");
    } catch {
      return {};
    }
  })();
  const [prefs, setPrefs] = useState({
    scan_complete: parsedPrefs.scan_complete ?? true,
    critical_alerts: parsedPrefs.critical_alerts ?? true,
    weekly_digest: parsedPrefs.weekly_digest ?? false,
    credit_warnings: parsedPrefs.credit_warnings ?? true,
  });

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || "");
      try {
        const parsed = JSON.parse(currentUser.notification_preferences || "{}");
        setPrefs({
          scan_complete: parsed.scan_complete ?? true,
          critical_alerts: parsed.critical_alerts ?? true,
          weekly_digest: parsed.weekly_digest ?? false,
          credit_warnings: parsed.credit_warnings ?? true,
        });
      } catch {}
    }
  }, [currentUser]);

  // ── DANGER ZONE STATE ──
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ── PASSWORD STRENGTH CALCULATION ──
  const getPasswordStrength = (pw) => {
    if (!pw) return { label: "", color: "bg-slate-700", width: "w-0" };
    if (pw.length < 8) return { label: "Too Short (Min 8 chars)", color: "bg-danger", width: "w-1/4" };
    let score = 0;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    
    if (score === 0) return { label: "Weak", color: "bg-danger", width: "w-1/4" };
    if (score === 1) return { label: "Fair", color: "bg-warning", width: "w-2/4" };
    if (score === 2) return { label: "Strong", color: "bg-primary", width: "w-3/4" };
    return { label: "Very Strong", color: "bg-safe", width: "w-full" };
  };
  const strength = getPasswordStrength(newPw);

  // Save profile info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error("Full Name cannot be empty.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile(profileName);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPw) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Confirm password does not match.");
      return;
    }
    setUpdatingPw(true);
    try {
      await changePassword(currentPw, newPw);
      toast.success("Password updated");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast.error(err.message || "Incorrect current password.");
    } finally {
      setUpdatingPw(false);
    }
  };

  // Notification toggles
  const handleTogglePref = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await updateNotifications(updated);
    } catch (err) {
      toast.error("Failed to save notification preferences.");
      // Rollback
      setPrefs(prefs);
    }
  };

  // Delete account
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (confirmDeleteText !== "DELETE") {
      toast.error("Please type DELETE to confirm account removal.");
      return;
    }
    if (!confirm("Are you absolutely sure you want to permanently delete your Vektra account? This cannot be undone.")) {
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteAccount(confirmDeleteText);
      toast.success("Account deleted successfully.");
      navigate("/");
    } catch (err) {
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const pkey = currentUser?.stellar_public_key || "G...";

  return (
    <div className="flex h-screen bg-[#0d0f1a] text-slate-100 overflow-hidden font-sans select-none">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {/* Tabbed workspace */}
        <div className="flex-1 flex min-w-0">
          
          {/* Left vertical settings tabs */}
          <div className="w-60 border-r border-[#1e2240] bg-[#0a0c16]/30 p-6 flex flex-col space-y-1.5 shrink-0">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2 px-3">
              Settings
            </span>
            {[
              { id: "profile", label: "Profile", icon: User },
              { id: "security", label: "Security", icon: Lock },
              { id: "wallet", label: "Wallet Console", icon: Wallet },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "danger", label: "Danger Zone", icon: Trash2, red: true }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isSelected 
                      ? (tab.red ? "bg-danger/10 text-danger" : "bg-[#1e2240] text-white border-l-2 border-primary") 
                      : (tab.red ? "text-danger/70 hover:bg-danger/5" : "text-muted hover:bg-[#141628] hover:text-slate-200")
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <TabIcon className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isSelected ? "translate-x-0.5" : ""}`} />
                </button>
              );
            })}
          </div>

          {/* Right tab panel content */}
          <div className="flex-1 overflow-y-auto p-8 max-w-xl">
            
            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-xl font-bold text-white">Profile Settings</h2>
                  <p className="text-xs text-muted mt-0.5">Configure your operator details.</p>
                </div>

                <div className="flex items-center gap-4 border-b border-[#1e2240] pb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-bold text-2xl text-primary shrink-0 shadow-[0_0_15px_rgba(124,58,237,0.2)]">
                    {initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Avatar Image</h4>
                    <p className="text-[10px] text-muted mt-0.5">Using security system avatar initials</p>
                    <button className="text-xs text-primary font-bold hover:underline mt-1.5 block" disabled>
                      Change Avatar
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Security Operator"
                      className="w-full bg-[#141628]/60 border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5 opacity-70">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Email Address (Read-only)</label>
                    <input
                      type="email"
                      readOnly
                      value={email}
                      className="w-full bg-[#0a0c16] border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-muted cursor-not-allowed font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-primary hover:bg-primary/80 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                  >
                    {savingProfile ? "Saving changes..." : "Save changes"}
                  </button>
                </form>
              </div>
            )}

            {/* ── SECURITY TAB ── */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-xl font-bold text-white">Change Password</h2>
                  <p className="text-xs text-muted mt-0.5">Secure your console workspace account.</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="Enter current password..."
                      className="w-full bg-[#141628]/60 border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-[#141628]/60 border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                    />
                    
                    {/* Strength Indicator */}
                    {newPw && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-[#0d0f1a] h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                        </div>
                        <span className="text-[9px] font-bold text-muted block">Password strength: {strength.label}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full bg-[#141628]/60 border border-[#1e2240] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-muted focus:outline-none focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updatingPw}
                    className="bg-primary hover:bg-primary/80 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                  >
                    {updatingPw ? "Updating password..." : "Update password"}
                  </button>
                </form>
              </div>
            )}

            {/* ── WALLET TAB ── */}
            {activeTab === "wallet" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-xl font-bold text-white">Wallet Connection</h2>
                  <p className="text-xs text-muted mt-0.5">Manage keys and credits allowance.</p>
                </div>

                <div className="bg-[#141628] border border-[#1e2240] rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Stellar Public Address</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(pkey);
                        toast.success("Copied to clipboard");
                      }}
                      className="text-muted hover:text-white transition-colors"
                      title="Copy Address"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-mono text-xs text-slate-200 block truncate bg-[#0d0f1a] p-2.5 rounded-lg border border-[#1e2240]/40">
                    {pkey}
                  </span>

                  <div className="grid grid-cols-2 gap-4 border-t border-[#1e2240]/60 pt-4 text-xs font-semibold text-slate-300">
                    <div>
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Active Tier</span>
                      <span className="text-primary mt-1 block uppercase">{currentUser?.tier || "free"}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Credits Remaining</span>
                      <span className="text-safe mt-1 block">{currentUser?.credits_balance ?? 0} CRED</span>
                    </div>
                  </div>
                </div>

                <Link 
                  to="/wallet"
                  className="inline-flex items-center justify-center gap-1.5 bg-[#141628] border border-[#1e2240] hover:border-primary/40 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors"
                >
                  View full wallet
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-xl font-bold text-white">Notifications</h2>
                  <p className="text-xs text-muted mt-0.5">Toggle real-time alerts and security warnings.</p>
                </div>

                <div className="space-y-4">
                  
                  {/* Toggle 1: Scan Complete */}
                  <div className="flex items-center justify-between p-4 bg-[#141628] border border-[#1e2240] rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Scan Complete Notifications</h4>
                      <p className="text-[10px] text-muted mt-0.5">Alert me when a graph scan finishes.</p>
                    </div>
                    <button 
                      onClick={() => handleTogglePref("scan_complete")}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center ${prefs.scan_complete ? "bg-primary" : "bg-[#0d0f1a] border border-[#1e2240]"}`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${prefs.scan_complete ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Toggle 2: Critical alerts */}
                  <div className="flex items-center justify-between p-4 bg-[#141628] border border-[#1e2240] rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Critical Vulnerability Alerts</h4>
                      <p className="text-[10px] text-muted mt-0.5">Urgent emails for critical conflicts.</p>
                    </div>
                    <button 
                      onClick={() => handleTogglePref("critical_alerts")}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center ${prefs.critical_alerts ? "bg-primary" : "bg-[#0d0f1a] border border-[#1e2240]"}`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${prefs.critical_alerts ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Toggle 3: Weekly digest */}
                  <div className="flex items-center justify-between p-4 bg-[#141628] border border-[#1e2240] rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Weekly Security Digest</h4>
                      <p className="text-[10px] text-muted mt-0.5">Summary of previous scans.</p>
                    </div>
                    <button 
                      onClick={() => handleTogglePref("weekly_digest")}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center ${prefs.weekly_digest ? "bg-primary" : "bg-[#0d0f1a] border border-[#1e2240]"}`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${prefs.weekly_digest ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Toggle 4: Credit warnings */}
                  <div className="flex items-center justify-between p-4 bg-[#141628] border border-[#1e2240] rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Credit Balance Warnings</h4>
                      <p className="text-[10px] text-muted mt-0.5">Alert when tokens are below 5 credits.</p>
                    </div>
                    <button 
                      onClick={() => handleTogglePref("credit_warnings")}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center ${prefs.credit_warnings ? "bg-primary" : "bg-[#0d0f1a] border border-[#1e2240]"}`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${prefs.credit_warnings ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* ── DANGER ZONE TAB ── */}
            {activeTab === "danger" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-xl font-bold text-danger">Danger Zone</h2>
                  <p className="text-xs text-muted mt-0.5">Irreversible workspace profile deletion.</p>
                </div>

                <div className="bg-[#141628] border border-danger/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Delete Account</h4>
                      <p className="text-[10px] text-muted mt-1 leading-relaxed">
                        This will permanently delete your account, all scan history, and forfeit your VEKTRA credits. This cannot be undone.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleDeleteAccount} className="space-y-3 border-t border-[#1e2240] pt-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">
                        Type DELETE to confirm
                      </label>
                      <input
                        type="text"
                        required
                        value={confirmDeleteText}
                        onChange={(e) => setConfirmDeleteText(e.target.value)}
                        placeholder="Type DELETE..."
                        className="w-full bg-[#0d0f1a] border border-[#1e2240] rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-muted focus:outline-none focus:border-danger transition-all duration-200 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={deletingAccount || confirmDeleteText !== "DELETE"}
                      className="bg-danger hover:bg-danger/80 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                    >
                      {deletingAccount ? "Deleting account..." : "Delete my account"}
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
