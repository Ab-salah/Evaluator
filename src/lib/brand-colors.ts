// The operators' own brand colours (hex, for inline styles and SVG), so
// charts read at a glance for anyone who knows the market.
const KNOWN: Record<string, string> = {
  zain: "#23aeb7",
  stc: "#4f008c",
  batelco: "#d4212a",
};

// For any other operator, drawn from the Zain palette.
const PALETTE = ["#c3d534", "#e27faf", "#0550a5", "#f6a400", "#034146", "#9b4291"];

/** Assigns each operator a fixed colour so it looks the same on every screen. */
export function brandColors(brands: string[]): Record<string, string> {
  const others = [...new Set(brands)].filter((b) => !KNOWN[b.toLowerCase()]).sort((a, b) => a.localeCompare(b));
  const colors: Record<string, string> = {};
  for (const b of brands) colors[b] = KNOWN[b.toLowerCase()] ?? PALETTE[others.indexOf(b) % PALETTE.length];
  return colors;
}

export const colorFor = (colors: Record<string, string>, brand: string) => colors[brand] ?? "#8a93b3";
