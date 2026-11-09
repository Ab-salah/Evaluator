import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { computeScore, type ElementCounts } from "@/lib/scoring";
import { getMatrixRules } from "@/lib/matrix";
import { canonicalBrand, getKnownBrands } from "@/lib/brands";
import { deleteSubmissionImage } from "@/lib/storage";
import { bad, readBody } from "@/lib/http";

/** Status for the audit page to poll while AI scoring runs. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { id: true, status: true, submittedById: true, updatedAt: true },
  });
  if (!submission || (auth.user.role !== "ADMIN" && submission.submittedById !== auth.user.id)) {
    return bad("Not found", 404);
  }
  return Response.json({ status: submission.status, updatedAt: submission.updatedAt });
}

/**
 * Admin correction / manual scoring: replaces the set of operators and their
 * counts that the final scores are based on. The AI's own counts
 * (aiCounts/aiScore) on rows it created are kept as an audit trail.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiUser("ADMIN");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await readBody(req);
  if (!body) return bad("Request body must be a JSON object");

  const reviewNotes = typeof body.reviewNotes === "string" && body.reviewNotes.trim() ? body.reviewNotes.trim() : null;
  const shopName = typeof body.shopName === "string" ? body.shopName.trim() : undefined;
  const input = body.brands as { brand: string; counts: ElementCounts }[] | undefined;
  if (!Array.isArray(input)) return bad("brands must be a list");

  const [rules, knownBrands] = await Promise.all([getMatrixRules(), getKnownBrands()]);
  const brands = new Map<string, ElementCounts>();
  for (const entry of input) {
    const name = String(entry?.brand ?? "").trim();
    if (!name) return bad("Every operator needs a name");
    const counts = entry.counts as Record<string, unknown> | undefined;
    if (!rules.every((r) => Number.isInteger(counts?.[r.key]) && (counts?.[r.key] as number) >= 0)) {
      return bad(`Counts for ${name} must include a whole number of 0 or more for every matrix element`);
    }
    const brand = canonicalBrand(name, knownBrands);
    if (brands.has(brand)) return bad(`${brand} is listed twice`);
    brands.set(brand, Object.fromEntries(rules.map((r) => [r.key, counts![r.key] as number])));
  }

  const existing = await prisma.submission.findUnique({ where: { id }, select: { shopId: true, aiSummary: true } });
  if (!existing) return bad("Not found", 404);
  const failedNote = existing.aiSummary?.startsWith("AI scoring failed") ?? false;

  await prisma.$transaction(async (tx) => {
    await tx.brandScore.deleteMany({ where: { submissionId: id, brand: { notIn: [...brands.keys()] } } });
    for (const [brand, counts] of brands) {
      const finalScore = computeScore(counts, rules).totalScore;
      await tx.brandScore.upsert({
        where: { submissionId_brand: { submissionId: id, brand } },
        update: { finalCounts: counts, finalScore },
        create: { submissionId: id, brand, finalCounts: counts, finalScore },
      });
    }
    if (shopName) await tx.shop.update({ where: { id: existing.shopId }, data: { name: shopName } });
    await tx.submission.update({
      where: { id },
      data: {
        status: "REVIEWED",
        reviewedById: auth.user.id,
        reviewedAt: new Date(),
        reviewNotes,
        // A failure note is moot once an admin has scored the photo.
        ...(failedNote ? { aiSummary: null } : {}),
      },
    });
  });

  return Response.json({ ok: true });
}

/** Admin: delete an audit (e.g. a duplicate or a wrong photo). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiUser("ADMIN");
  if (auth.error) return auth.error;
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { imagePath: true, shopId: true, shop: { select: { _count: { select: { submissions: true } } } } },
  });
  if (!submission) return bad("Not found", 404);

  await prisma.submission.delete({ where: { id } });
  // Drop the shop too when this was its only audit, so it leaves the rankings.
  if (submission.shop._count.submissions <= 1) await prisma.shop.delete({ where: { id: submission.shopId } }).catch(() => {});
  await deleteSubmissionImage(submission.imagePath).catch((e) => console.error("[delete] photo cleanup failed:", e));
  return Response.json({ ok: true });
}
