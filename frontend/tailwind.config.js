/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pageBg: "var(--bg-base)",
        sidebarBg: "var(--bg-surface)",
        cardSurface: "var(--bg-surface)",
        cardBorder: "var(--border-hairline)",
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        danger: "var(--alert-red)",
        critical: "var(--alert-red)",
        warning: "var(--warn-amber)",
        safe: "var(--signal-blue)",
        info: "var(--signal-blue)",
        textMain: "var(--text-primary)",
        muted: "var(--text-muted)",
        activeNav: "var(--bg-elevated)",
        bgElevated: "var(--bg-elevated)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderWidth: {
        DEFAULT: '1px',
      },
      borderRadius: {
        lg: '6px',
        md: '6px',
        sm: '6px',
        xl: '6px',
      }
    },
  },
  plugins: [],
}
