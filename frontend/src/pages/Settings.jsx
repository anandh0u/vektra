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
  Copy,
  Sparkles,
  Palette,
  LogOut
} from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    updateProfile, 
    changePassword, 
    updateNotifications, 
    deleteAccount,
    signOut,
    theme,
    setTheme
  } = useVektraStore();

  const [activeTab, setActiveTab] = useState("profile");

  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [updatingPw, setUpdatingPw] = useState(false);

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

  const [currentTheme, setCurrentTheme] = useState(theme || "dark");
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem("vektra_color_primary") || "#4C8DFF");
  const [secondaryColor, setSecondaryColor] = useState(localStorage.getItem("vektra_color_secondary") || "#8A93A6");

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

  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error("Full Name cannot be empty.");
      return;
    }
    setSavingProfile(true);
    try {
      if (updateProfile) {
        await updateProfile(profileName);
      } else {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const res = await fetch(`${API_BASE}/api/auth/profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("vektra_token")}`,
          },
          body: JSON.stringify({ name: profileName }),
        });
        if (!res.ok) throw new Error("Failed to update profile");
        const data = await res.json();
        useVektraStore.setState({ currentUser: { ...currentUser, name: profileName } });
        localStorage.setItem("vektra_user", JSON.stringify({ ...currentUser, name: profileName }));
      }
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

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

  const handleTogglePref = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await updateNotifications(updated);
    } catch (err) {
      toast.error("Failed to save notification preferences.");
      setPrefs(prefs);
    }
  };

  const handleThemeChange = (newTheme) => {
    setCurrentTheme(newTheme);
    setTheme(newTheme);
    toast.success(`Theme updated to ${newTheme}`);
  };

  const COLOR_PRESETS = [
    { name: "Operator Blue", primary: "#4C8DFF", secondary: "#8A93A6" },
    { name: "Cyber Pink", primary: "#D946EF", secondary: "#A78BFA" },
    { name: "Matrix Emerald", primary: "#10B981", secondary: "#6EE7B7" },
    { name: "Caution Amber", primary: "#F2A94B", secondary: "#8A93A6" },
  ];

  const handleApplyColors = (prim, sec) => {
    setPrimaryColor(prim);
    setSecondaryColor(sec);
    localStorage.setItem("vektra_color_primary", prim);
    localStorage.setItem("vektra_color_secondary", sec);
    document.documentElement.style.setProperty("--color-primary", prim);
    document.documentElement.style.setProperty("--color-secondary", sec);
    toast.success("Color preset accent updated!");
  };

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

  const handleSignOut = () => {
    signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const pkey = currentUser?.stellar_public_key || "G...";

  return (
    <div className="flex h-screen bg-pageBg text-textMain overflow-hidden font-sans select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 flex min-w-0">
          
          {/* Left vertical settings tabs */}
          <div className="w-60 border-r border-cardBorder bg-[#12161F]/20 p-6 flex flex-col shrink-0 justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2 px-3">
                Settings Drawer
              </span>
              {[
                { id: "profile", label: "Profile Settings", icon: User },
                { id: "security", label: "Security Console", icon: Lock },
                { id: "wallet", label: "Wallet Console", icon: Wallet },
                { id: "notifications", label: "Notification Setup", icon: Bell },
                { id: "appearance", label: "UI Appearance", icon: Palette },
                { id: "danger", label: "Danger Workspace", icon: Trash2, red: true }
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold transition-fast ${
                      isSelected 
                        ? (tab.red ? "bg-danger/10 text-danger border border-danger/30" : "bg-activeNav text-textMain border border-cardBorder") 
                        : (tab.red ? "text-danger hover:bg-danger/5" : "text-muted hover:bg-cardSurface hover:text-textMain")
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <TabIcon className="w-4 h-4 shrink-0" />
                      {tab.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                );
              })}
            </div>

            <div className="border-t border-cardBorder pt-4">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-danger hover:bg-danger/10 transition-fast"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Operator
              </button>
            </div>
          </div>

          {/* Right tab panel content */}
          <div className="flex-1 overflow-y-auto p-8 max-w-xl">
            
            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-textMain uppercase tracking-wider">Profile Settings</h2>
                  <p className="text-xs text-muted mt-0.5 font-normal">Configure your operator profile info.</p>
                </div>

                <div className="flex items-center gap-4 border-b border-cardBorder pb-6">
                  <div className="w-16 h-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xl text-primary shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-textMain uppercase tracking-wide">Operator Initials</h4>
                    <p className="text-[10px] text-muted mt-0.5 font-normal">Derived from account registration</p>
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
                      className="w-full bg-pageBg border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
                    />
                  </div>

                  <div className="space-y-1.5 opacity-70">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-wider block">Email Address (Read-only)</label>
                    <input
                      type="email"
                      readOnly
                      value={currentUser?.email || ""}
                      className="w-full bg-cardSurface border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-muted cursor-not-allowed font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="h-10 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white px-4 rounded-[6px] text-xs font-semibold transition-fast border border-primary/20"
                  >
                    {savingProfile ? "Saving changes..." : "Save Profile"}
                  </button>
                </form>
              </div>
            )}

            {/* ── SECURITY TAB ── */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-textMain uppercase tracking-wider">Change Password</h2>
                  <p className="text-xs text-muted mt-0.5 font-normal">Rotate your console access credentials.</p>
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
                      className="w-full bg-pageBg border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
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
                      className="w-full bg-pageBg border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
                    />
                    
                    {newPw && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-pageBg h-1.5 rounded-full overflow-hidden border border-cardBorder">
                          <div className={`h-full rounded-full transition-fast ${strength.color} ${strength.width}`} />
                        </div>
                        <span className="text-[9px] font-semibold text-muted font-mono block">Strength: {strength.label}</span>
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
                      className="w-full bg-pageBg border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-primary transition-fast"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updatingPw}
                    className="h-10 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white px-4 rounded-[6px] text-xs font-semibold transition-fast border border-primary/20"
                  >
                    {updatingPw ? "Updating password..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}

            {/* ── WALLET TAB ── */}
            {activeTab === "wallet" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-textMain uppercase tracking-wider">Wallet Connection</h2>
                  <p className="text-xs text-muted mt-0.5 font-normal">Manage keys and credits allowance.</p>
                </div>

                <div className="bg-cardSurface border border-cardBorder rounded-[6px] p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Stellar Public Address</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(pkey);
                        toast.success("Copied to clipboard");
                      }}
                      className="text-muted hover:text-textMain transition-fast"
                      title="Copy Address"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-mono text-xs text-textMain block truncate bg-pageBg p-2.5 rounded-[6px] border border-cardBorder">
                    {pkey}
                  </span>

                  <div className="grid grid-cols-2 gap-4 border-t border-cardBorder pt-4 text-xs font-semibold text-textMain">
                    <div>
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Active Plan</span>
                      <span className="text-primary mt-1 block uppercase font-mono">{currentUser?.tier || "free"}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Credits Balance</span>
                      <span className="text-primary mt-1 block font-mono">{currentUser?.credits_balance ?? 0} CRED</span>
                    </div>
                  </div>
                </div>

                <Link 
                  to="/wallet"
                  className="inline-flex items-center justify-center gap-1.5 bg-cardSurface border border-cardBorder hover:border-muted/30 rounded-[6px] px-4 py-2.5 text-xs font-bold text-textMain transition-fast"
                >
                  View Wallet Keys
                  <ChevronRight className="w-4 h-4 text-primary" />
                </Link>
              </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-textMain uppercase tracking-wider">Notifications</h2>
                  <p className="text-xs text-muted mt-0.5 font-normal">Toggle real-time alerts and system warnings.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { key: "scan_complete", label: "Scan Complete Alerts", desc: "Notify when background parser tasks finish." },
                    { key: "critical_alerts", label: "Critical Risk Alerts", desc: "Urgent notifications for path-escalation findings." },
                    { key: "weekly_digest", label: "Weekly Telemetry digest", desc: "Summary reports of historical scans." },
                    { key: "credit_warnings", label: "Quota Balance Warnings", desc: "Warnings when daily tokens dip below 5 CRED." },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-cardSurface border border-cardBorder rounded-[6px]">
                      <div>
                        <h4 className="text-xs font-bold text-textMain">{item.label}</h4>
                        <p className="text-[10px] text-muted mt-0.5 font-normal">{item.desc}</p>
                      </div>
                      <button 
                        onClick={() => handleTogglePref(item.key)}
                        className={`w-10 h-5.5 rounded-full p-0.5 transition-fast relative flex items-center ${prefs[item.key] ? "bg-primary border border-primary/20" : "bg-pageBg border border-cardBorder"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${prefs[item.key] ? "translate-x-4.5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── APPEARANCE TAB ── */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-textMain uppercase tracking-wider">Theme & Styling</h2>
                  <p className="text-xs text-muted mt-0.5 font-normal">Customize the visual palette of your workspace.</p>
                </div>

                {/* Theme Selector */}
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-muted uppercase tracking-wider block font-mono">UI Color Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "dark", name: "Default Dark", desc: "Sleek dark graphite design" },
                      { id: "light", name: "Default Light", desc: "Clean bright alabaster design" },
                      { id: "cyberpunk", name: "Cyberpunk Mode", desc: "Deep vibrant violet neon" },
                      { id: "forest", name: "Forest Mode", desc: "Obsidian Matrix green" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`p-3.5 rounded-[6px] border text-left transition-fast ${
                          currentTheme === t.id 
                            ? "bg-activeNav border-primary text-textMain" 
                            : "bg-cardSurface/60 border-cardBorder text-muted hover:text-textMain"
                        }`}
                      >
                        <span className="text-xs font-bold block">{t.name}</span>
                        <span className="text-[9px] opacity-75 mt-0.5 block">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Palette Change */}
                <div className="space-y-3 border-t border-cardBorder pt-6">
                  <label className="text-[9px] font-bold text-muted uppercase tracking-wider block font-mono">Primary Preset Accent</label>
                  <div className="space-y-2">
                    {COLOR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleApplyColors(preset.primary, preset.secondary)}
                        className="w-full flex items-center justify-between p-3 rounded-[6px] bg-cardSurface/40 border border-cardBorder hover:bg-cardSurface hover:border-muted/30 transition-fast"
                      >
                        <span className="text-xs font-semibold text-textMain">{preset.name}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.secondary }} />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Color Pickers */}
                  <div className="grid grid-cols-2 gap-4 border-t border-cardBorder pt-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider block font-mono">Custom Primary Color</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={primaryColor} 
                          onChange={(e) => handleApplyColors(e.target.value, secondaryColor)}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent" 
                        />
                        <span className="text-[10px] font-mono text-muted uppercase">{primaryColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider block font-mono">Custom Secondary Color</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={secondaryColor} 
                          onChange={(e) => handleApplyColors(primaryColor, e.target.value)}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent" 
                        />
                        <span className="text-[10px] font-mono text-muted uppercase">{secondaryColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DANGER ZONE TAB ── */}
            {activeTab === "danger" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-danger uppercase tracking-wider">Danger Zone</h2>
                  <p className="text-xs text-muted mt-0.5 font-normal">Irreversible workspace profile deletion.</p>
                </div>

                <div className="bg-cardSurface border border-danger/20 rounded-[6px] p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-textMain uppercase tracking-wide">Delete Workspace Account</h4>
                      <p className="text-[10px] text-muted mt-1 leading-relaxed font-normal">
                        This will permanently delete your account, all scan history, and forfeit your remaining credits. This action cannot be reversed.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleDeleteAccount} className="space-y-3 border-t border-cardBorder pt-4">
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
                        className="w-full bg-pageBg border border-cardBorder rounded-[6px] px-3.5 py-2 text-xs text-textMain placeholder-muted focus:outline-none focus:border-danger transition-fast font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={deletingAccount || confirmDeleteText !== "DELETE"}
                      className="bg-danger hover:bg-danger/90 disabled:opacity-50 text-white px-4 py-2.5 rounded-[6px] text-xs font-bold transition-fast border border-danger/25"
                    >
                      {deletingAccount ? "Deleting account..." : "Delete Operator Profile"}
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
