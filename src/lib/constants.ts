export const CATEGORY_COLORS = {
  music: {
    bg: "oklch(78.3% 0.134 238)",
    text: "#000",
    border: "oklch(65% 0.134 238)",
    label: "Music",
  },
  art: {
    bg: "oklch(78.3% 0.134 358)",
    text: "#000",
    border: "oklch(65% 0.134 358)",
    label: "Art",
  },
  writing: {
    bg: "oklch(78.3% 0.134 88)",
    text: "#000",
    border: "oklch(65% 0.134 88)",
    label: "Writing",
  },
  performance: {
    bg: "oklch(78.3% 0.134 298)",
    text: "#000",
    border: "oklch(65% 0.134 298)",
    label: "Performance",
  },
  photography: {
    bg: "oklch(78.3% 0.134 148)",
    text: "#000",
    border: "oklch(65% 0.134 148)",
    label: "Photography",
  },
} as const;

export type ArtCategory = keyof typeof CATEGORY_COLORS;

export const CATEGORIES = Object.keys(CATEGORY_COLORS) as ArtCategory[];

export const SITE_CONFIG = {
  name: "The Museum of Time Based Art",
  shortName: "MOTBA",
  description:
    "Celebrating artists who commit to long-duration and daily creative practices.",
  url: "https://motba.art",
} as const;
