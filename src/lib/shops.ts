import { prisma } from "./db";
import type { ElementCounts, MatrixElementRule } from "./scoring";
import { actionPlan, HOME_BRAND, type ActionPlan } from "./action-plan";
import { UNNAMED_SHOP } from "./scoring-job";

const SCORED = new Set(["SCORED", "REVIEWED"]);
const round = (n: number) => Math.round(n * 100) / 100;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export type ShopBrand = { brand: string; score: number; counts: ElementCounts };

export type ShopSummary = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  audits: number;
  lastAuditAt: Date;
  /** Status of the newest audit, scored or not (e.g. still scoring). */
  lastStatus: string;
  /** The newest scored audit, which the shop's standing is based on. */
  latest: { submissionId: string; imagePath: string; createdAt: Date; brands: ShopBrand[] } | null;
  plan: ActionPlan | null;
  /** Home brand's score now and its change since the shop's previous scored audit. */
  home: { score: number; change: number | null } | null;
};

const brandsOf = (rows: { brand: string; finalScore: number; finalCounts: unknown }[]): ShopBrand[] =>
  rows
    .map((b) => ({ brand: b.brand, score: b.finalScore, counts: (b.finalCounts as ElementCounts | null) ?? {} }))
    .sort((a, b) => b.score - a.score);

const homeScore = (brands: ShopBrand[]) => brands.find((b) => same(b.brand, HOME_BRAND))?.score ?? 0;

/** Every shop with at least one audit, newest activity first. */
export async function getShopSummaries(rules: MatrixElementRule[]): Promise<ShopSummary[]> {
  const shops = await prisma.shop.findMany({
    where: { submissions: { some: {} }, name: { not: UNNAMED_SHOP } },
    include: {
      submissions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, imagePath: true, createdAt: true, status: true, brandScores: { select: { brand: true, finalScore: true, finalCounts: true } } },
      },
    },
  });

  return shops
    .map((shop) => {
      const scored = shop.submissions.filter((s) => SCORED.has(s.status));
      const latest = scored[0] ? { submissionId: scored[0].id, imagePath: scored[0].imagePath, createdAt: scored[0].createdAt, brands: brandsOf(scored[0].brandScores) } : null;
      const previous = scored[1] ? brandsOf(scored[1].brandScores) : null;
      return {
        id: shop.id,
        name: shop.name,
        code: shop.code,
        city: shop.city,
        region: shop.region,
        audits: shop.submissions.length,
        lastAuditAt: shop.submissions[0].createdAt,
        lastStatus: shop.submissions[0].status,
        latest,
        plan: latest ? actionPlan(latest.brands, rules) : null,
        home: latest
          ? { score: homeScore(latest.brands), change: previous ? round(homeScore(latest.brands) - homeScore(previous)) : null }
          : null,
      };
    })
    .sort((a, b) => b.lastAuditAt.getTime() - a.lastAuditAt.getTime());
}

/** One shop with its full audit history (newest first). */
export async function getShopDetail(id: string) {
  return prisma.shop.findUnique({
    where: { id },
    include: {
      submissions: {
        orderBy: { createdAt: "desc" },
        include: { submittedBy: { select: { name: true } }, brandScores: true },
      },
    },
  });
}

export { SCORED as SCORED_STATUSES, brandsOf };
