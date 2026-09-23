export type BrandColor = { chip: string; bar: string };

// The operators' own brand colours, so charts read at a glance for anyone
// who knows the market.
const KNOWN: Record<string, BrandColor> = {
  zain: { chip: "bg-teal-50 text-teal-700 ring-teal-200", bar: "bg-teal-500" },
  stc: { chip: "bg-purple-50 text-purple-700 ring-purple-200", bar: "bg-purple-600" },
  batelco: { chip: "bg-red-50 text-red-700 ring-red-200", bar: "bg-red-600" },
};

// For any operator not listed above.
const PALETTE: BrandColor[] = [
  { chip: "bg-amber-50 text-amber-800 ring-amber-200", bar: "bg-amber-500" },
  { chip: "bg-sky-50 text-sky-700 ring-sky-200", bar: "bg-sky-500" },
  { chip: "bg-lime-50 text-lime-800 ring-lime-200", bar: "bg-lime-500" },
  { chip: "bg-pink-50 text-pink-700 ring-pink-200", bar: "bg-pink-500" },
  { chip: "bg-indigo-50 text-indigo-700 ring-indigo-200", bar: "bg-indigo-500" },
];

/** Assigns each operator a fixed colour so it looks the same on every screen. */
export function brandColors(brands: string[]): Record<string, BrandColor> {
  const others = [...new Set(brands)]
    .filter((b) => !KNOWN[b.toLowerCase()])
    .sort((a, b) => a.localeCompare(b));
  const colors: Record<string, BrandColor> = {};
  for (const b of brands) {
    colors[b] = KNOWN[b.toLowerCase()] ?? PALETTE[others.indexOf(b) % PALETTE.length];
  }
  return colors;
}
