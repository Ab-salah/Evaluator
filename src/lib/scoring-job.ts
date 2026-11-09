import { prisma } from "./db";
import { computeScore, type ElementCounts } from "./scoring";
import { getMatrixRules } from "./matrix";
import { canonicalBrand, getKnownBrands } from "./brands";
import { aiEnabled, describeAiError, detectBrandVisibility, type BrandDetection } from "./ai-vision";
import { readSubmissionImage } from "./storage";

/** Placeholder used when a rep leaves the name blank for the AI to read. */
export const UNNAMED_SHOP = "Unnamed shop";

// Merges entries that name the same operator once spellings are normalised.
function mergeByBrand(detections: BrandDetection[], known: string[]): BrandDetection[] {
  const merged = new Map<string, BrandDetection>();
  for (const d of detections) {
    const brand = canonicalBrand(d.brand, known);
    const existing = merged.get(brand);
    if (!existing) {
      merged.set(brand, { ...d, brand });
      continue;
    }
    const counts: ElementCounts = { ...existing.counts };
    for (const [key, n] of Object.entries(d.counts)) counts[key] = (counts[key] ?? 0) + n;
    merged.set(brand, { brand, counts, reasoning: { ...existing.reasoning, ...d.reasoning } });
  }
  return [...merged.values()];
}

/**
 * Moves a submission off the "Unnamed shop" placeholder onto the shop the AI
 * read from the sign (re-using an existing shop of that name).
 */
async function renameUnnamedShop(submissionId: string, shopId: string, aiName: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, include: { _count: { select: { submissions: true } } } });
  if (!shop || shop.name !== UNNAMED_SHOP) return;
  const existing = await prisma.shop.findFirst({ where: { name: { equals: aiName, mode: "insensitive" }, code: null } });
  if (existing) {
    await prisma.submission.update({ where: { id: submissionId }, data: { shopId: existing.id } });
    if (shop._count.submissions <= 1) await prisma.shop.delete({ where: { id: shop.id } }).catch(() => {});
  } else {
    await prisma.shop.update({ where: { id: shop.id }, data: { name: aiName } });
  }
}

/**
 * Runs AI scoring for one submission and stores the result. Never throws:
 * any failure leaves the submission FLAGGED with a readable reason, so it
 * shows up in the admin review queue for manual scoring.
 */
export async function scoreSubmission(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) return;

  try {
    if (!(await aiEnabled())) throw new Error("AI scoring is switched off (no API key under Settings), so please score this photo manually.");
    const image = await readSubmissionImage(submission.imagePath);
    if (!image) throw new Error("The stored photo could not be found on the server.");

    const [rules, knownBrands] = await Promise.all([getMatrixRules(), getKnownBrands()]);
    const detection = await detectBrandVisibility({
      imageBase64: image.buffer.toString("base64"),
      mediaType: image.mediaType,
      rules,
      knownBrands,
    });
    const brands = mergeByBrand(detection.brands, knownBrands);

    await prisma.$transaction(async (tx) => {
      // A re-run replaces the previous AI result entirely.
      await tx.brandScore.deleteMany({ where: { submissionId } });
      await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: "SCORED",
          aiSummary: detection.overallSummary,
          aiConfidence: detection.confidence,
          subjectiveRatings: { customerAppeal: detection.customerAppeal, industryStandard: detection.industryStandard },
          reviewedById: null,
          reviewedAt: null,
          brandScores: {
            create: brands.map((b) => {
              const score = computeScore(b.counts, rules).totalScore;
              return { brand: b.brand, aiCounts: b.counts, aiScore: score, reasoning: b.reasoning, finalCounts: b.counts, finalScore: score };
            }),
          },
        },
      });
    });

    if (detection.shopName) await renameUnnamedShop(submissionId, submission.shopId, detection.shopName);
  } catch (err) {
    const reason = describeAiError(err);
    console.error(`[scoring] submission ${submissionId} failed:`, err);
    await prisma.submission
      .update({ where: { id: submissionId }, data: { status: "FLAGGED", aiSummary: `AI scoring failed: ${reason}` } })
      .catch((e) => console.error(`[scoring] could not flag ${submissionId}:`, e));
  }
}

// Photos still PENDING after this long were orphaned (e.g. the server
// restarted mid-scoring) and are offered for a re-run.
export const STUCK_AFTER_MS = 10 * 60_000;

export function isStuck(status: string, createdAt: Date): boolean {
  return status === "PENDING" && Date.now() - createdAt.getTime() > STUCK_AFTER_MS;
}
