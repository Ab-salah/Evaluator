import { prisma } from "./db";

export type ShopRow = {
  shopId: string;
  shopName: string;
  location: string;
  submissionId: string;
  imagePath: string;
  capturedAt: Date;
  status: string;
  brands: { brand: string; score: number }[];
  total: number;
};

export type OperatorRow = {
  brand: string;
  avgScore: number;
  presentIn: number;
  bestShop: { name: string; score: number };
};

export type DashboardData = {
  shops: ShopRow[];
  operators: OperatorRow[];
  totalAudits: number;
  awaitingReview: { id: string; shopName: string; status: string; capturedAt: Date }[];
};

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
      .map((b) => ({ brand: b.brand, score: b.finalScore }))
      .sort((a, b) => b.score - a.score);
    return {
      shopId: s.shopId,
      shopName: s.shop.name,
      location: [s.shop.city, s.shop.region].filter(Boolean).join(" · "),
      submissionId: s.id,
      imagePath: s.imagePath,
      capturedAt: s.capturedAt,
      status: s.status,
      brands,
      total: round(brands.reduce((sum, b) => sum + b.score, 0)),
    };
  });

  const brandNames = [...new Set(shops.flatMap((s) => s.brands.map((b) => b.brand)))];
  const operators: OperatorRow[] = brandNames
    .map((brand) => {
      const carrying = shops
        .map((s) => ({ name: s.shopName, score: s.brands.find((b) => b.brand === brand)?.score }))
        .filter((s): s is { name: string; score: number } => s.score !== undefined);
      const best = carrying.reduce((a, b) => (b.score > a.score ? b : a));
      return {
        brand,
        // Averaged over every audited shop, counting shops without the brand
        // as zero: an operator absent from most shops shouldn't rank high.
        avgScore: round(carrying.reduce((sum, s) => sum + s.score, 0) / shops.length),
        presentIn: carrying.length,
        bestShop: best,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  return {
    shops,
    operators,
    totalAudits,
    awaitingReview: awaitingReview.map((s) => ({
      id: s.id,
      shopName: s.shop.name,
      status: s.status,
      capturedAt: s.capturedAt,
    })),
  };
}
