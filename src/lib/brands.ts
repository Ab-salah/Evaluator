import { prisma } from "./db";

export async function getKnownBrands(): Promise<string[]> {
  const rows = await prisma.brandScore.findMany({
    distinct: ["brand"],
    select: { brand: true },
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand);
}

/**
 * Maps a brand name onto the spelling already on record, ignoring case and
 * spacing, so "STC", "stc" and " Stc " all aggregate as one operator on the
 * dashboard. A name not seen before is kept as given.
 */
export function canonicalBrand(name: string, known: string[]): string {
  const cleaned = name.trim().replace(/\s+/g, " ");
  const key = cleaned.toLowerCase();
  return known.find((k) => k.toLowerCase() === key) ?? cleaned;
}
