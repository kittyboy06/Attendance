/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#09090B",
        surface: "#18181B",
        "text-primary": "#F4F4F5",
        "text-muted": "#A1A1AA",
        "border-subtle": "rgba(63, 63, 70, 0.4)",
        teal: {
          accent: "#0D9488",
          hover: "#0F766E",
        },
        crimson: {
          alert: "#E11D48",
        }
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Satoshi", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      }
    },
  },
  plugins: [],
}
