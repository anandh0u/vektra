/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pageBg: "#0B0E14",
        sidebarBg: "#12161F",
        cardSurface: "#12161F",
        cardBorder: "#232838",
        primary: "#4C8DFF",
        secondary: "#8A93A6",
        danger: "#FF5C4D",
        critical: "#FF5C4D",
        warning: "#F2A94B",
        safe: "#4C8DFF", // safe/verified maps to signal-blue
        info: "#4C8DFF",
        textMain: "#E8EAED",
        muted: "#8A93A6",
        activeNav: "#1A1F2B",
        bgElevated: "#1A1F2B",
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
