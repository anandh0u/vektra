/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pageBg: "#0d0f1a",
        sidebarBg: "#0a0c16",
        cardSurface: "#141628",
        cardBorder: "#1e2240",
        primary: "#7c3aed",
        secondary: "#06b6d4",
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
