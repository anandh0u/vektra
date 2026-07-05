/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pageBg: "var(--color-pageBg)",
        sidebarBg: "var(--color-sidebarBg)",
        cardSurface: "var(--color-cardSurface)",
        cardBorder: "var(--color-cardBorder)",
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        danger: "#ef4444",
        warning: "#f59e0b",
        safe: "#10b981",
        textMain: "#f1f5f9",
        muted: "#4a5280",
        activeNav: "#1e2240",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        heading: ["Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
}
