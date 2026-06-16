/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        "bg-card": "var(--bg-card)",
        "bg-card-hover": "var(--bg-card-hover)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-600": "var(--accent-600)",
        "accent-light": "var(--accent-light)",
        "accent-bg": "var(--accent-bg)",
        "accent-border": "var(--accent-border)",
        warning: "var(--warning)",
        "warning-bg": "var(--warning-bg)",
        "warning-border": "var(--warning-border)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      }
    },
  },
  plugins: [],
}
