module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0d0f1a",
        sidebar: "#0a0c16",
        card: "#141628",
        border: "#1e2240",
        primary: "#7c3aed",
        secondary: "#06b6d4",
        danger: "#ef4444",
        warning: "#f59e0b",
        safe: "#10b981",
        muted: "#4a5280",
        textMain: "#f1f5f9",
        textSoft: "#c4c9e8"
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        heading: ["SpaceGrotesk_700Bold"],
        mono: ["monospace"]
      }
    }
  }
};
