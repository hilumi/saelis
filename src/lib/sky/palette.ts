import type { SkyPalette, SkyPhase } from "@/lib/sky/types";

/**
 * Phase palettes, grown from the Saelis token garden. Night stays a soft
 * celestial blue — never black, never neon — and the standard ink text
 * (#2D3650) remains readable against every phase, so content never inverts
 * into a dark theme.
 */

const INK = "#2D3650";

export const SKY_PALETTES: Record<SkyPhase, SkyPalette> = {
  "pre-dawn": {
    skyTop: "#8E96B4",
    skyMiddle: "#A9AEC9",
    skyBottom: "#C7C7DC",
    horizon: "#D8D8E6",
    cloudLight: "#D5D8E8",
    cloudShadow: "#9BA1BE",
    mist: "#C9CDE0",
    celestialGlow: "#E8E9F2",
    starColor: "#F2F3FA",
    textOverlay: INK,
    glassTint: "rgba(252, 251, 255, 0.8)",
  },
  dawn: {
    skyTop: "#B7C7E4",
    skyMiddle: "#D3CBE8",
    skyBottom: "#F4DFE3",
    horizon: "#F4E3C8",
    cloudLight: "#FBEFF4",
    cloudShadow: "#B9B4D4",
    mist: "#EADDE4",
    celestialGlow: "#F7E9C9",
    starColor: "#F5F3EF",
    textOverlay: INK,
    glassTint: "rgba(252, 251, 255, 0.74)",
  },
  morning: {
    skyTop: "#C7DFF7",
    skyMiddle: "#DDEBFA",
    skyBottom: "#EDF6FD",
    horizon: "#F4EEDC",
    cloudLight: "#FFFFFF",
    cloudShadow: "#C4D8EC",
    mist: "#E7F2F8",
    celestialGlow: "#FDF6E3",
    starColor: "#FFFFFF",
    textOverlay: INK,
    glassTint: "rgba(255, 255, 255, 0.72)",
  },
  day: {
    skyTop: "#BFD9F4",
    skyMiddle: "#D6E8FA",
    skyBottom: "#EAF4FD",
    horizon: "#F1F2E8",
    cloudLight: "#FFFFFF",
    cloudShadow: "#B9CFE6",
    mist: "#E4F0FA",
    celestialGlow: "#FCFBFF",
    starColor: "#FFFFFF",
    textOverlay: INK,
    glassTint: "rgba(255, 255, 255, 0.7)",
  },
  "golden-hour": {
    skyTop: "#C4CBE8",
    skyMiddle: "#E5D6E4",
    skyBottom: "#F6E3D0",
    horizon: "#EED9A8",
    cloudLight: "#FBEFE0",
    cloudShadow: "#C0AECB",
    mist: "#F0E2D6",
    celestialGlow: "#F0D9A6",
    starColor: "#FBF4E4",
    textOverlay: INK,
    glassTint: "rgba(253, 250, 244, 0.74)",
  },
  sunset: {
    skyTop: "#9FA3C9",
    skyMiddle: "#CBAECB",
    skyBottom: "#E9C4C2",
    horizon: "#E4B99F",
    cloudLight: "#F3D9D6",
    cloudShadow: "#9E93BC",
    mist: "#DFC4CC",
    celestialGlow: "#EDC3A4",
    starColor: "#F6EFE7",
    textOverlay: INK,
    glassTint: "rgba(253, 248, 248, 0.76)",
  },
  twilight: {
    skyTop: "#8289B3",
    skyMiddle: "#9C9BC6",
    skyBottom: "#C0B7D8",
    horizon: "#CDC1DC",
    cloudLight: "#CFCBE4",
    cloudShadow: "#8A87B0",
    mist: "#B7B3D2",
    celestialGlow: "#E3E0F0",
    starColor: "#F4F2FC",
    textOverlay: INK,
    glassTint: "rgba(252, 251, 255, 0.8)",
  },
  night: {
    skyTop: "#767FA6",
    skyMiddle: "#9098BC",
    skyBottom: "#AFB2CF",
    horizon: "#C3C3DA",
    cloudLight: "#C9CCE2",
    cloudShadow: "#8188AC",
    mist: "#A9AECB",
    celestialGlow: "#EDEFF8",
    starColor: "#FBFBFF",
    textOverlay: INK,
    glassTint: "rgba(252, 251, 255, 0.84)",
  },
};

const HEX_PATTERN = /^#([0-9a-f]{6})$/i;

function parseHex(hex: string): [number, number, number] | null {
  const match = HEX_PATTERN.exec(hex);
  if (!match) return null;
  const value = Number.parseInt(match[1] as string, 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/** Linear interpolation between two #rrggbb colors; non-hex values snap at t≥0.5. */
export function lerpColor(from: string, to: string, t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return clamped < 0.5 ? from : to;
  const mix = a.map((channel, index) =>
    Math.round(channel + ((b[index] as number) - channel) * clamped),
  );
  return `#${mix.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** Blend every palette color toward the next phase. Glass/text snap, never blur. */
export function interpolatePalette(from: SkyPalette, to: SkyPalette, t: number): SkyPalette {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    skyTop: lerpColor(from.skyTop, to.skyTop, clamped),
    skyMiddle: lerpColor(from.skyMiddle, to.skyMiddle, clamped),
    skyBottom: lerpColor(from.skyBottom, to.skyBottom, clamped),
    horizon: lerpColor(from.horizon, to.horizon, clamped),
    cloudLight: lerpColor(from.cloudLight, to.cloudLight, clamped),
    cloudShadow: lerpColor(from.cloudShadow, to.cloudShadow, clamped),
    mist: lerpColor(from.mist, to.mist, clamped),
    celestialGlow: lerpColor(from.celestialGlow, to.celestialGlow, clamped),
    starColor: lerpColor(from.starColor, to.starColor, clamped),
    textOverlay: clamped < 0.5 ? from.textOverlay : to.textOverlay,
    glassTint: clamped < 0.5 ? from.glassTint : to.glassTint,
  };
}
