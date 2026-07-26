import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050706",
        panel: "#101311",
        green: "#16ab55",
        gold: "#ffbd00",
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI Variable", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
