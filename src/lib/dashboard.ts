import { prisma } from "./db";
import type { ElementCounts } from "./scoring";

export type ShopRow = {
  shopId: string;
  shopName: string;
  location: string;
  submissionId: string;
  imagePath: string;
  capturedAt: Date;
  status: string;
  brands: { brand: string; score: number; counts: ElementCounts }[];
  total: number;
};

export type OperatorRow = {
  brand: string;
  avgScore: number;
  presentIn: number;
  bestShop: { name: string; score: number };
  worstShop: { name: string; score: number };
  // Average count per matrix element, over shops that carry this operator
  // (not the whole shop list): the basis for "what needs the most work".
  avgCounts: ElementCounts;
};

/** Operator standings at the end of each recent week (same rules as the standings card). */
export type Trend = { labels: string[]; series: { brand: string; values: number[] }[] };

export type DashboardData = {
  shops: ShopRow[];
  operators: OperatorRow[];
  totalAudits: number;
  avgScore: number;
  awaitingReview: { id: string; shopName: string; status: string; capturedAt: Date }[];
  trend: Trend | null;
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

type ScoredAudit = { shopId: string; createdAt: Date; brandScores: { brand: string; finalScore: number }[] };

/**
 * For each of the last `weeks` weeks: every operator's average score per shop,
 * using each shop's latest scored audit as of that week's end, with shops
 * that don't carry the operator counting as 0. The last point equals today's
 * standings. Null until there are at least two weeks with data.
 */
function weeklyStandings(scored: ScoredAudit[], weeks = 8): Trend | null {
  if (scored.length === 0) return null;
  const now = Date.now();
  const ends = Array.from({ length: weeks }, (_, k) => now - (weeks - 1 - k) * WEEK);
  const oldestFirst = [...scored].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const brands = [...new Set(scored.flatMap((s) => s.brandScores.map((b) => b.brand)))];

  const points = ends.map((end) => {
    const latest = new Map<string, ScoredAudit>();
    for (const a of oldestFirst) if (a.createdAt.getTime() <= end) latest.set(a.shopId, a);
    if (latest.size === 0) return null;
    const shops = [...latest.values()];
    return Object.fromEntries(
      brands.map((b) => [b, round(shops.reduce((sum, s) => sum + (s.brandScores.find((x) => x.brand === b)?.finalScore ?? 0), 0) / shops.length)]),
    ) as Record<string, number>;
  });
  const first = points.findIndex((p) => p !== null);
  if (first < 0 || weeks - first < 2) return null;

  const tz = process.env.TZ || "Asia/Bahrain";
  const labels = ends.slice(first).map((t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz }));
  const series = brands
    .map((brand) => ({ brand, values: points.slice(first).map((p) => p![brand]) }))
    .sort((a, b) => b.values[b.values.length - 1] - a.values[a.values.length - 1]);
  return { labels, series };
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Everything on the dashboard is based on each shop's most recent scored
 * audit, so re-photographing a shop replaces its standing rather than
 * double-counting it.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [scored, totalAudits, awaitingReview] = await Promise.all([
    prisma.submission.findMany({
      where: { status: { in: ["SCORED", "REVIEWED"] } },
      include: { shop: true, brandScores: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.count(),
    prisma.submission.findMany({
      where: { status: { in: ["PENDING", "FLAGGED"] } },
      include: { shop: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const latestPerShop = new Map<string, (typeof scored)[number]>();
  for (const s of scored) {
    if (!latestPerShop.has(s.shopId)) latestPerShop.set(s.shopId, s);
  }

  const shops: ShopRow[] = [...latestPerShop.values()].map((s) => {
    const brands = s.brandScores
      .map((b) => ({ brand: b.brand, score: b.finalScore, counts: (b.finalCounts as ElementCounts | null) ?? {} }))
      .sort((a, b) => b.score - a.score);
    return {
      shopId: s.shopId,
      shopName: s.shop.name,
      location: [...new Set([s.shop.city, s.shop.region].filter(Boolean))].join(" · "),
      submissionId: s.id,
      imagePath: s.imagePath,
      capturedAt: s.capturedAt,
      status: s.status,
      brands,
      total: round(brands.reduce((sum, b) => sum + b.score, 0)),
    };
  });

  const brandScoreByShop = new Map<string, (typeof scored)[number]["brandScores"]>();
  for (const s of latestPerShop.values()) brandScoreByShop.set(s.shopId, s.brandScores);

  const brandNames = [...new Set(shops.flatMap((s) => s.brands.map((b) => b.brand)))];
  const operators: OperatorRow[] = brandNames
    .map((brand) => {
      const carrying = shops
        .map((s) => ({ name: s.shopName, score: s.brands.find((b) => b.brand === brand)?.score }))
        .filter((s): s is { name: string; score: number } => s.score !== undefined);
      const best = carrying.reduce((a, b) => (b.score > a.score ? b : a));
      const worst = carrying.reduce((a, b) => (b.score < a.score ? b : a));

      const countsList = [...brandScoreByShop.values()]
        .map((rows) => rows.find((r) => r.brand === brand)?.finalCounts as ElementCounts | undefined)
        .filter((c): c is ElementCounts => c !== undefined);
      const keys = [...new Set(countsList.flatMap((c) => Object.keys(c)))];
      const avgCounts = Object.fromEntries(
        keys.map((k) => [k, round(countsList.reduce((sum, c) => sum + (c[k] ?? 0), 0) / countsList.length)]),
      );

      return {
        brand,
        // Averaged over every audited shop, counting shops without the brand
        // as zero: an operator absent from most shops shouldn't rank high.
        avgScore: round(carrying.reduce((sum, s) => sum + s.score, 0) / shops.length),
        presentIn: carrying.length,
        bestShop: best,
        worstShop: worst,
        avgCounts,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const avgScore = shops.length
    ? round(shops.reduce((sum, s) => sum + s.total, 0) / shops.length)
    : 0;

  return {
    shops,
    operators,
    totalAudits,
    avgScore,
    trend: weeklyStandings(scored),
    awaitingReview: awaitingReview.map((s) => ({
      id: s.id,
      shopName: s.shop.name,
      status: s.status,
      capturedAt: s.capturedAt,
    })),
  };
}
