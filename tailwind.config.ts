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
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
        sm: "0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
        md: "0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)",
        lg: "0 8px 32px rgba(0, 0, 0, 0.10), 0 4px 8px rgba(0, 0, 0, 0.04)",
        xl: "0 16px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)",
        soft: "0 2px 8px rgba(0, 0, 0, 0.05)",
        card: "0 4px 12px rgba(0, 0, 0, 0.08)",
        inset: "inset 0 2px 4px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        btn: "10px",
        card: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
