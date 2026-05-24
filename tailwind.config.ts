import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Single accent: desaturated emerald. Replaces the previous AI-purple.
        accent: {
          DEFAULT: "#047857",
          hover: "#065f46",
          ink: "#ecfdf5",
        },
        ink: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        diffusion: "0 24px 60px -28px rgba(12, 10, 9, 0.18)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        bento: "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
