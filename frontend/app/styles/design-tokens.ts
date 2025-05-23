/**
 * FBO LaunchPad Design System Tokens
 *
 * This file contains all the design tokens used throughout the application.
 * Always reference these tokens instead of hardcoding values to maintain consistency.
 */

// Color Palette
export const colors = {
  // Primary Colors
  primary: {
    50: "#e6f7ff",
    100: "#bae7ff",
    200: "#91d5ff",
    300: "#69c0ff",
    400: "#40a9ff",
    500: "#1890ff", // Primary brand color
    600: "#096dd9",
    700: "#0050b3",
    800: "#003a8c",
    900: "#002766",
  },

  // Neutral Colors
  neutral: {
    50: "#f8f9fa",
    100: "#f1f3f5",
    200: "#e9ecef",
    300: "#dee2e6",
    400: "#ced4da",
    500: "#adb5bd",
    600: "#868e96",
    700: "#495057",
    800: "#343a40",
    900: "#212529",
  },

  // Status Colors
  success: {
    50: "#e6f7ee",
    100: "#c3e9d5",
    500: "#52c41a",
    600: "#389e0d",
    700: "#237804",
  },
  warning: {
    50: "#fffbe6",
    100: "#fff1b8",
    500: "#faad14",
    600: "#d48806",
    700: "#ad6800",
  },
  error: {
    50: "#fff1f0",
    100: "#ffccc7",
    500: "#ff4d4f",
    600: "#f5222d",
    700: "#cf1322",
  },
  info: {
    50: "#e6f7ff",
    100: "#bae7ff",
    500: "#1890ff",
    600: "#096dd9",
    700: "#0050b3",
  },

  // Background Colors
  background: {
    light: "#ffffff",
    dark: "#141414",
    lightAlt: "#f8f9fa",
    darkAlt: "#1f1f1f",
  },

  // Text Colors
  text: {
    light: {
      primary: "#212529",
      secondary: "#495057",
      disabled: "#adb5bd",
    },
    dark: {
      primary: "#f8f9fa",
      secondary: "#dee2e6",
      disabled: "#868e96",
    },
  },

  // Border Colors
  border: {
    light: "#dee2e6",
    dark: "#434343",
    lightFocus: "#40a9ff",
    darkFocus: "#177ddc",
  },
}

// Typography
export const typography = {
  fontFamily: {
    base: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
}

// Spacing
export const spacing = {
  0: "0",
  1: "0.25rem", // 4px
  2: "0.5rem", // 8px
  3: "0.75rem", // 12px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  8: "2rem", // 32px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
  32: "8rem", // 128px
}

// Border Radius
export const borderRadius = {
  none: "0",
  sm: "0.125rem", // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  xl: "0.75rem", // 12px
  "2xl": "1rem", // 16px
  full: "9999px",
}

// Shadows
export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
  none: "none",
}

// Z-index
export const zIndex = {
  0: "0",
  10: "10",
  20: "20",
  30: "30",
  40: "40",
  50: "50",
  auto: "auto",
}

// Transitions
export const transitions = {
  duration: {
    75: "75ms",
    100: "100ms",
    150: "150ms",
    200: "200ms",
    300: "300ms",
    500: "500ms",
    700: "700ms",
    1000: "1000ms",
  },
  timing: {
    ease: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    linear: "linear",
    easeIn: "cubic-bezier(0.42, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.58, 1)",
    easeInOut: "cubic-bezier(0.42, 0, 0.58, 1)",
  },
}

// Breakpoints
export const breakpoints = {
  xs: "0px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
}

// Layout
export const layout = {
  sidebarWidth: {
    expanded: "280px",
    collapsed: "80px",
  },
  headerHeight: "64px",
  contentMaxWidth: "1440px",
}
