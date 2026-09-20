import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeScore, ELEMENT_KEYS, type ElementCounts } from "@/lib/scoring";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { shop: true, submittedBy: true, reviewedBy: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ submission });
}

/**
 * Reviewer override: replaces the counts used for the final score. The AI's
 * original counts (aiElements/aiScore) are left untouched as an audit trail.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const counts = body.counts as Partial<ElementCounts> | undefined;
  const reviewerEmail = String(body.reviewerEmail ?? "").trim();
  const reviewerName = String(body.reviewerName ?? "").trim();
  const reviewNotes = body.reviewNotes ? String(body.reviewNotes) : undefined;

  if (!counts || !ELEMENT_KEYS.every((k) => typeof counts[k] === "number")) {
    return NextResponse.json(
      { error: "counts must include a number for every element key" },
      { status: 400 },
    );
  }
  if (!reviewerEmail) {
    return NextResponse.json({ error: "reviewerEmail is required" }, { status: 400 });
  }

  const reviewer = await prisma.user.upsert({
    where: { email: reviewerEmail },
    update: {},
    create: { email: reviewerEmail, name: reviewerName || reviewerEmail, role: "REVIEWER" },
  });

  const breakdown = computeScore(counts);

  const submission = await prisma.submission.update({
    where: { id },
    data: {
      finalElements: { counts },
      finalScore: breakdown.totalScore,
      status: "REVIEWED",
      reviewedById: reviewer.id,
      reviewNotes,
    },
    include: { shop: true, submittedBy: true, reviewedBy: true },
  });

  return NextResponse.json({ submission, breakdown });
}
