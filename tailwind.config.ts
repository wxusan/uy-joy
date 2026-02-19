import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Design System Colors
        navy: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          300: "#9fb3c8",
          400: "#829ab1",
          500: "#627d98",
          600: "#486581",
          700: "#334e68",
          800: "#243b53",
          900: "#1E2A38",
        },
        gold: {
          50: "#fdf8f0",
          100: "#f9ecd8",
          200: "#f3d9b1",
          300: "#e8c48a",
          400: "#C9A86A",
          500: "#b8944d",
          600: "#9a7a3d",
          700: "#7c6231",
          800: "#5e4a25",
          900: "#40321a",
        },
        status: {
          available: "#4CAF50",
          reserved: "#F9A825",
          sold: "#E53935",
        },
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.05)",
        card: "0 4px 12px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        btn: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
