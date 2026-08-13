export const APPEARANCE_KEY = "vektra_appearance_v2";

export const THEME_PRESETS = [
  { id: "dark", name: "Obsidian", description: "Focused graphite operations console", colors: ["#030303", "#3b82f6", "#fafafa"] },
  { id: "bluish", name: "Deep Space", description: "Navy command center with cool signals", colors: ["#0b1120", "#60a5fa", "#f8fafc"] },
  { id: "light", name: "Daylight", description: "High-clarity enterprise workspace", colors: ["#fafaf9", "#2563eb", "#1c1917"] },
  { id: "cyberpunk", name: "Spectra", description: "Violet threat-research environment", colors: ["#0c0514", "#ec4899", "#fdf4ff"] },
  { id: "forest", name: "Terminal", description: "Emerald forensic operations mode", colors: ["#050806", "#10b981", "#ecfdf5"] },
  { id: "aurora", name: "Aurora", description: "Teal intelligence canvas with violet depth", colors: ["#061014", "#2dd4bf", "#f0fdfa"] },
];

export const ACCENT_PRESETS = [
  { id: "operator", name: "Operator", primary: "#4C8DFF", secondary: "#8B5CF6" },
  { id: "sentinel", name: "Sentinel", primary: "#2DD4BF", secondary: "#38BDF8" },
  { id: "spectra", name: "Spectra", primary: "#D946EF", secondary: "#8B5CF6" },
  { id: "matrix", name: "Matrix", primary: "#10B981", secondary: "#84CC16" },
  { id: "signal", name: "Signal", primary: "#F59E0B", secondary: "#EF4444" },
];

export const DEFAULT_APPEARANCE = {
  theme: "dark", primary: "#4C8DFF", secondary: "#8B5CF6",
  density: "comfortable", radius: "soft", effects: "balanced", motion: true,
};

export function loadAppearance() {
  try {
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function applyAppearance(next) {
  const value = { ...DEFAULT_APPEARANCE, ...next };
  const root = document.documentElement;
  root.dataset.theme = value.theme;
  root.dataset.density = value.density;
  root.dataset.radius = value.radius;
  root.dataset.effects = value.effects;
  root.dataset.motion = value.motion ? "on" : "off";
  root.style.setProperty("--color-primary", value.primary);
  root.style.setProperty("--signal-blue", value.primary);
  root.style.setProperty("--color-secondary", value.secondary);
  root.style.setProperty("--accent-secondary", value.secondary);
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(value));
  localStorage.setItem("vektra_theme", value.theme);
  localStorage.setItem("vektra_color_primary", value.primary);
  localStorage.setItem("vektra_color_secondary", value.secondary);
  return value;
}
