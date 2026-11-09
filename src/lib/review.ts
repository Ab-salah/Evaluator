import { prisma } from "./db";
import { STUCK_AFTER_MS } from "./scoring-job";

/**
 * What an admin has to act on:
 *  - FLAGGED: AI scoring failed (or is off) — needs manual scoring
 *  - stuck PENDING: scoring never finished (e.g. server restart) — re-run AI
 *  - SCORED: AI scored it, nobody has checked it yet — confirm or correct
 */
export async function reviewQueueCount(): Promise<number> {
  const stuckBefore = new Date(Date.now() - STUCK_AFTER_MS);
  return prisma.submission.count({
    where: {
      OR: [{ status: { in: ["FLAGGED", "SCORED"] } }, { status: "PENDING", createdAt: { lt: stuckBefore } }],
    },
  });
}

const include = { shop: true, submittedBy: { select: { name: true } }, brandScores: { select: { brand: true, finalScore: true } } } as const;

export async function getReviewQueue() {
  const stuckBefore = new Date(Date.now() - STUCK_AFTER_MS);
  const [failed, toCheck, inProgress, recent] = await Promise.all([
    prisma.submission.findMany({
      where: { OR: [{ status: "FLAGGED" }, { status: "PENDING", createdAt: { lt: stuckBefore } }] },
      include,
      orderBy: { createdAt: "asc" },
    }),
    prisma.submission.findMany({ where: { status: "SCORED" }, include, orderBy: { createdAt: "asc" } }),
    prisma.submission.findMany({
      where: { status: "PENDING", createdAt: { gte: stuckBefore } },
      include,
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.findMany({
      where: { status: "REVIEWED" },
      include: { ...include, reviewedBy: { select: { name: true } } },
      orderBy: { reviewedAt: { sort: "desc", nulls: "last" } },
      take: 20,
    }),
  ]);

  // Least certain AI results first: those are the ones most worth a human look.
  const rank = { low: 0, medium: 1, high: 2 } as Record<string, number>;
  toCheck.sort((a, b) => (rank[a.aiConfidence ?? "low"] ?? 0) - (rank[b.aiConfidence ?? "low"] ?? 0));

  return { failed, toCheck, inProgress, recent };
}
