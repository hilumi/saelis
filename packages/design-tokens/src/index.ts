/**
 * Saelis design tokens — the single platform-agnostic source of truth for the
 * visual language. Values mirror the finalized palette in
 * `src/app/globals.css` (web). Framework-free: plain TypeScript constants,
 * usable from React Native, web, or tooling.
 */

/* ------------------------------------------------------------------ */
/* Colors                                                              */
/* ------------------------------------------------------------------ */

export const colors = {
  sky: {
    blue: "#DDEBFA",
    lilac: "#E9E2F8",
    blush: "#F8E3EB",
    cream: "#FFF8E8",
  },
  pearlWhite: "#FCFBFF",
  cloud: {
    white: "#FFFFFF",
    blue: "#EDF6FD",
    lilac: "#F0ECFA",
    pink: "#FBEFF4",
    mint: "#ECF7F3",
  },
  horizonGold: "#D8C18F",
  quietMint: "#CDE6DE",
  accent: {
    blue: "#97B9DC",
    lilac: "#AA9AD4",
    blush: "#DCAFC0",
  },
  text: {
    /** Primary ink — readable on every sky phase; the app never inverts dark. */
    primary: "#2D3650",
    secondary: "#68728A",
    muted: "#8992A5",
  },
  focusRing: "#AA9AD4",
} as const;

/** Translucent pearl-glass surface tints (native interpretation of backdrop glass). */
export const glass = {
  /** Card / panel fill over the Living Sky. */
  surface: "rgba(255, 255, 255, 0.72)",
  /** Stronger fill for tab bars and inputs. */
  surfaceStrong: "rgba(255, 255, 255, 0.82)",
  /** Hairline border: white warmed with a whisper of lilac. */
  border: "rgba(233, 226, 248, 0.9)",
  /** Inner highlight line. */
  highlight: "rgba(255, 255, 255, 0.7)",
} as const;

/* ------------------------------------------------------------------ */
/* Spacing — 4pt scale                                                 */
/* ------------------------------------------------------------------ */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

/* ------------------------------------------------------------------ */
/* Radii — one corner geometry across the app                          */
/* ------------------------------------------------------------------ */

export const radii = {
  /** Cards, panels, dialogs. */
  surface: 20,
  /** Buttons, pills, chips. */
  control: 999,
  /** Inputs, textareas. */
  field: 16,
  /** Small chrome (focus outlines, thumbnails). */
  small: 6,
} as const;

/* ------------------------------------------------------------------ */
/* Typography — one family (Manrope), clear steps                      */
/* ------------------------------------------------------------------ */

export const fontFamilies = {
  /** Loaded natively via expo-font; on web via next/font. */
  sans: "Manrope",
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

/**
 * Native-friendly fixed sizes; mirrors the web `.type-*` hierarchy
 * (clamped fluid sizes on web resolve to these at mobile widths).
 */
export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: fontWeights.semibold, letterSpacing: -0.45 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: fontWeights.semibold, letterSpacing: -0.23 },
  section: { fontSize: 18, lineHeight: 24, fontWeight: fontWeights.semibold, letterSpacing: -0.09 },
  body: { fontSize: 16, lineHeight: 25, fontWeight: fontWeights.regular, letterSpacing: 0.08 },
  /** Conversation text: warm, unhurried, comfortable measure. */
  conversation: {
    fontSize: 17,
    lineHeight: 28,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.03,
  },
  label: { fontSize: 14, lineHeight: 20, fontWeight: fontWeights.medium, letterSpacing: 0.14 },
  meta: { fontSize: 12, lineHeight: 17, fontWeight: fontWeights.medium, letterSpacing: 0.48 },
} as const;

/* ------------------------------------------------------------------ */
/* Shadows — soft ink (#2D3650), never harsh                           */
/* ------------------------------------------------------------------ */

export const shadows = {
  /** Pearl-glass surface lift: 0 8 32 rgba(45,54,80,0.08). */
  surface: {
    shadowColor: "#2D3650",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
    shadowOpacity: 0.08,
    elevation: 4,
  },
  /** Small chrome (skip links, floating chips): 0 4 24 rgba(45,54,80,0.12). */
  chrome: {
    shadowColor: "#2D3650",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 24,
    shadowOpacity: 0.12,
    elevation: 6,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Motion — three speeds, two curves                                   */
/* ------------------------------------------------------------------ */

export const motion = {
  durations: {
    /** Pressed / immediate feedback. */
    fast: 120,
    /** Hover, focus, micro-interactions. */
    base: 200,
    /** Entrances, environmental shifts. */
    slow: 420,
  },
  easings: {
    /** Settle-in, no bounce: cubic-bezier(0.32, 0.72, 0.24, 1). */
    glide: [0.32, 0.72, 0.24, 1] as const,
    /** Exit: cubic-bezier(0.4, 0, 0.68, 0.06). */
    exit: [0.4, 0, 0.68, 0.06] as const,
  },
} as const;

/** The Living Sky gradient, top → bottom (day base; phases may tint it). */
export const livingSkyGradient = [
  colors.sky.blue,
  colors.sky.lilac,
  colors.sky.blush,
  colors.sky.cream,
] as const;

export const tokens = {
  colors,
  glass,
  spacing,
  radii,
  fontFamilies,
  fontWeights,
  typography,
  shadows,
  motion,
  livingSkyGradient,
} as const;

export type SaelisTokens = typeof tokens;
