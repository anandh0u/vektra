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
import { ACCENT_PRESETS, THEME_PRESETS, applyAppearance, loadAppearance } from "../utils/appearance";

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

  const [appearance, setAppearance] = useState(() => ({ ...loadAppearance(), theme: theme || loadAppearance().theme }));

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
    if (newPw.length < 12) {
      toast.error("New password must be at least 12 characters.");
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
    const updated = applyAppearance({ ...appearance, theme: newTheme });
    setAppearance(updated);
    setTheme(newTheme);
    toast.success("Workspace theme updated");
  };

  const handleApplyColors = (prim, sec) => {
    setAppearance(applyAppearance({ ...appearance, primary: prim, secondary: sec }));
    toast.success("Accent system updated");
  };

  const updateAppearance = (patch) => setAppearance(applyAppearance({ ...appearance, ...patch }));

  const resetAppearance = () => {
    const reset = applyAppearance({ theme: "dark", primary: "#4C8DFF", secondary: "#8B5CF6", density: "comfortable", radius: "soft", effects: "balanced", motion: true });
    setAppearance(reset);
    setTheme(reset.theme);
    toast.success("Appearance reset");
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

        <div className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden">
          
          {/* Left vertical settings tabs */}
          <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-cardBorder bg-cardSurface/20 p-3 md:p-6 flex md:flex-col shrink-0 justify-between overflow-x-auto md:overflow-visible">
            <div className="flex md:block gap-2 md:space-y-1.5 min-w-max md:min-w-0">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2 px-3">
                Settings
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
                    className={`flex items-center justify-between w-auto md:w-full px-3 py-2 rounded-lg text-xs font-semibold transition-fast whitespace-nowrap ${
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

            <div className="hidden md:block border-t border-cardBorder pt-4">
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 w-full max-w-4xl">
            
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
                      placeholder="Minimum 12 characters"
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
              <div className="space-y-7 pb-10">
                <div className="flex items-start justify-between gap-4">
                  <div><h2 className="text-lg font-bold text-textMain">Workspace appearance</h2><p className="text-xs text-muted mt-1">A complete visual system, not just a color switch.</p></div>
                  <button onClick={resetAppearance} className="rounded-lg border border-cardBorder px-3 py-2 text-[10px] font-bold text-muted hover:text-textMain">Reset</button>
                </div>

                <div className="vektra-surface overflow-hidden p-5" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${appearance.primary} 16%, var(--bg-surface)), color-mix(in srgb, ${appearance.secondary} 12%, var(--bg-surface)))` }}>
                  <div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-[.18em] text-muted">LIVE PREVIEW</span><span className="h-2.5 w-2.5 rounded-full" style={{ background: appearance.primary, boxShadow: `0 0 18px ${appearance.primary}` }} /></div>
                  <h3 className="vektra-accent-text mt-5 text-2xl font-bold">VEKTRA Intelligence</h3>
                  <p className="mt-2 max-w-md text-[11px] leading-5 text-muted">Surfaces, signals, spacing, motion, and interaction states update together across the workspace.</p>
                  <div className="mt-5 grid grid-cols-3 vektra-grid">{["Evidence", "Attack paths", "Agents"].map((label, i) => <div key={label} className="rounded-[var(--ui-radius)] border border-cardBorder bg-pageBg/40 p-3"><span className="text-[9px] text-muted">{label}</span><div className="mt-1 text-sm font-bold">{[94, 7, 4][i]}</div></div>)}</div>
                </div>

                <section className="space-y-3"><label className="text-[9px] font-bold text-muted uppercase tracking-[.16em]">Foundation theme</label><div className="grid gap-3 sm:grid-cols-2">{THEME_PRESETS.map(t => <button key={t.id} onClick={() => handleThemeChange(t.id)} className={`rounded-xl border p-4 text-left transition-fast ${appearance.theme === t.id ? "border-primary bg-primary/10" : "border-cardBorder bg-cardSurface/50 hover:border-primary/40"}`}><div className="mb-3 flex gap-1.5">{t.colors.map(color => <span key={color} className="h-4 w-4 rounded-full border border-white/10" style={{ background: color }} />)}</div><span className="block text-xs font-bold">{t.name}</span><span className="mt-1 block text-[9px] leading-4 text-muted">{t.description}</span></button>)}</div></section>

                <section className="space-y-3 border-t border-cardBorder pt-6"><label className="text-[9px] font-bold text-muted uppercase tracking-[.16em]">Signal palette</label><div className="grid gap-2 sm:grid-cols-2">{ACCENT_PRESETS.map(preset => <button key={preset.id} onClick={() => handleApplyColors(preset.primary, preset.secondary)} className={`flex items-center justify-between rounded-xl border p-3 ${appearance.primary.toLowerCase() === preset.primary.toLowerCase() ? "border-primary bg-primary/10" : "border-cardBorder bg-cardSurface/40 hover:border-primary/40"}`}><span className="text-xs font-semibold">{preset.name}</span><span className="flex -space-x-1"><span className="h-6 w-6 rounded-full border-2 border-cardSurface" style={{ background: preset.primary }} /><span className="h-6 w-6 rounded-full border-2 border-cardSurface" style={{ background: preset.secondary }} /></span></button>)}</div><div className="grid grid-cols-2 gap-3 pt-2">{[["Primary", "primary"], ["Secondary", "secondary"]].map(([label, key]) => <label key={key} className="rounded-xl border border-cardBorder bg-cardSurface/40 p-3"><span className="block text-[9px] font-bold uppercase text-muted">{label}</span><span className="mt-2 flex items-center gap-2"><input type="color" value={appearance[key]} onChange={e => updateAppearance({ [key]: e.target.value })} className="h-8 w-10 cursor-pointer border-0 bg-transparent" /><code className="text-[10px] text-muted">{appearance[key]}</code></span></label>)}</div></section>

                <section className="space-y-4 border-t border-cardBorder pt-6"><label className="text-[9px] font-bold text-muted uppercase tracking-[.16em]">Interface behavior</label>{[["Density", "density", [["Compact", "compact"], ["Comfortable", "comfortable"], ["Spacious", "spacious"]]], ["Corners", "radius", [["Sharp", "sharp"], ["Soft", "soft"], ["Round", "round"]]], ["Effects", "effects", [["Minimal", "minimal"], ["Balanced", "balanced"], ["Cinematic", "cinematic"]]]].map(([label, key, options]) => <div key={key}><span className="mb-2 block text-[10px] font-semibold">{label}</span><div className="grid grid-cols-3 rounded-xl border border-cardBorder bg-pageBg/40 p-1">{options.map(([name, value]) => <button key={value} onClick={() => updateAppearance({ [key]: value })} className={`rounded-lg px-2 py-2 text-[9px] font-bold ${appearance[key] === value ? "bg-primary text-white" : "text-muted hover:text-textMain"}`}>{name}</button>)}</div></div>)}<button onClick={() => updateAppearance({ motion: !appearance.motion })} className="flex w-full items-center justify-between rounded-xl border border-cardBorder bg-cardSurface/40 p-4 text-left"><span><span className="block text-xs font-bold">Interface motion</span><span className="mt-1 block text-[9px] text-muted">Disable animation for reduced motion or focused analysis.</span></span><span className={`relative h-6 w-11 rounded-full ${appearance.motion ? "bg-primary" : "bg-bgElevated"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${appearance.motion ? "translate-x-6" : "translate-x-1"}`} /></span></button></section>
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
