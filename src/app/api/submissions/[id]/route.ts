import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeScore, type ElementCounts } from "@/lib/scoring";
import { getMatrixRules } from "@/lib/matrix";
import { canonicalBrand, getKnownBrands } from "@/lib/brands";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { shop: true, submittedBy: true, reviewedBy: true, brandScores: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ submission });
}

/**
 * Reviewer correction: replaces the set of operators and their counts that
 * the final scores are based on. The AI's own counts (aiCounts/aiScore) on
 * rows it created are left untouched as an audit trail.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const reviewerEmail = String(body.reviewerEmail ?? "").trim();
  const reviewerName = String(body.reviewerName ?? "").trim();
  const reviewNotes = body.reviewNotes ? String(body.reviewNotes) : undefined;
  const input = body.brands as { brand: string; counts: ElementCounts }[] | undefined;

  if (!reviewerEmail) {
    return NextResponse.json({ error: "reviewerEmail is required" }, { status: 400 });
  }
  if (!Array.isArray(input)) {
    return NextResponse.json({ error: "brands must be a list" }, { status: 400 });
  }

  const [rules, knownBrands] = await Promise.all([getMatrixRules(), getKnownBrands()]);
  const brands = new Map<string, ElementCounts>();
  for (const entry of input) {
    const name = String(entry.brand ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Every operator needs a name" }, { status: 400 });
    }
    if (!rules.every((r) => typeof entry.counts?.[r.key] === "number")) {
      return NextResponse.json(
        { error: `Counts for ${name} must include a number for every matrix element` },
        { status: 400 },
      );
    }
    const brand = canonicalBrand(name, knownBrands);
    if (brands.has(brand)) {
      return NextResponse.json({ error: `${brand} is listed twice` }, { status: 400 });
    }
    brands.set(brand, entry.counts);
  }

  const reviewer = await prisma.user.upsert({
    where: { email: reviewerEmail },
    update: {},
    create: { email: reviewerEmail, name: reviewerName || reviewerEmail, role: "REVIEWER" },
  });

  const submission = await prisma.$transaction(async (tx) => {
    await tx.brandScore.deleteMany({
      where: { submissionId: id, brand: { notIn: [...brands.keys()] } },
    });
    for (const [brand, counts] of brands) {
      const finalScore = computeScore(counts, rules).totalScore;
      await tx.brandScore.upsert({
        where: { submissionId_brand: { submissionId: id, brand } },
        update: { finalCounts: counts, finalScore },
        create: { submissionId: id, brand, finalCounts: counts, finalScore },
      });
    }
    return tx.submission.update({
      where: { id },
      data: { status: "REVIEWED", reviewedById: reviewer.id, reviewNotes },
      include: { shop: true, brandScores: true, reviewedBy: true },
    });
  });

  return NextResponse.json({ submission });
}
