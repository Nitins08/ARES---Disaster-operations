/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Option 3 - Clean Minimal Color Theme
        brand: {
          teal: "#0F766E",       // Primary Deep Teal
          "teal-dark": "#0d655e",
          "teal-light": "#F0FDFA",
          forest: "#047857",     // Secondary Forest Green
          "forest-dark": "#036549",
          "forest-light": "#ECFDF5",
          coral: "#DC2626",      // Accent Coral Red
          "coral-dark": "#B91C1C",
          "coral-light": "#FEF2F2",
          bg: "#F9FAFB",         // Main Background
          card: "#FFFFFF",       // Card Background
          text: "#111827",       // Primary Text
          muted: "#64748B",      // Secondary Text
          border: "#E5E7EB",     // Borders
        },
        severity: {
          critical: "#DC2626",   // Red
          high: "#EA580C",       // Orange
          medium: "#D97706",     // Amber
          low: "#0F766E",        // Teal / Blue
        },
        border: "hsl(var(--border, 214.3 31.8% 91.4%))",
        input: "hsl(var(--input, 214.3 31.8% 91.4%))",
        ring: "hsl(var(--ring, 222.2 84% 4.9%))",
        background: "#F9FAFB",
        foreground: "#111827",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
}
