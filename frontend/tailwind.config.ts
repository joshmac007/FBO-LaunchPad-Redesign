import type { Config } from "tailwindcss"
import {
  colors,
  typography,
  spacing,
  borderRadius as designBorderRadius,
  shadows,
} from "./app/styles/design-tokens"

// Remove keys we will override (lg, md, sm) to avoid duplicate properties
const { lg: _lg, md: _md, sm: _sm, ...baseBorderRadius } = designBorderRadius

// Helper to convert numeric values in typography tokens to strings
const fontWeightStrings = Object.fromEntries(
  Object.entries(typography.fontWeight).map(([k, v]) => [k, v.toString()])
)

const lineHeightStrings = Object.fromEntries(
  Object.entries(typography.lineHeight).map(([k, v]) => [k, v.toString()])
)

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      fontFamily: {
        montserrat: ["var(--font-montserrat)", "sans-serif"],
        sans: [typography.fontFamily.base],
        mono: [typography.fontFamily.mono],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          ...colors.primary,
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Add status colors
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
        // Add neutral colors
        neutral: colors.neutral,
      },
      borderRadius: {
        ...baseBorderRadius,
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: typography.fontSize,
      fontWeight: fontWeightStrings,
      lineHeight: lineHeightStrings,
      spacing: spacing,
      boxShadow: shadows,
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
