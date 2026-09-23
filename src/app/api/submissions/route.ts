import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeScore, type ElementCounts } from "@/lib/scoring";
import { getMatrixRules } from "@/lib/matrix";
import { canonicalBrand, getKnownBrands } from "@/lib/brands";
import { detectBrandVisibility, type BrandDetection } from "@/lib/ai-vision";
import { isSupportedMediaType, saveSubmissionImage } from "@/lib/storage";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId") ?? undefined;

  const submissions = await prisma.submission.findMany({
    where: { shopId },
    include: { shop: true, submittedBy: true, brandScores: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ submissions });
}

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

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const shopName = String(form.get("shopName") ?? "").trim();
  const shopCode = String(form.get("shopCode") ?? "").trim() || undefined;
  const region = String(form.get("region") ?? "").trim() || undefined;
  const city = String(form.get("city") ?? "").trim() || undefined;

  const submitterName = String(form.get("submitterName") ?? "").trim();
  const submitterEmail = String(form.get("submitterEmail") ?? "").trim();

  const latitude = form.get("latitude") ? Number(form.get("latitude")) : undefined;
  const longitude = form.get("longitude") ? Number(form.get("longitude")) : undefined;
  const locationLabel = String(form.get("locationLabel") ?? "").trim() || undefined;

  const image = form.get("image");

  if (!shopName) {
    return NextResponse.json({ error: "shopName is required" }, { status: 400 });
  }
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image file is required" }, { status: 400 });
  }
  const mediaType = image.type;
  if (!isSupportedMediaType(mediaType)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${mediaType}. Use JPEG, PNG or WebP.` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const imagePath = await saveSubmissionImage(buffer, mediaType);

  const shop = shopCode
    ? await prisma.shop.upsert({
        where: { code: shopCode },
        update: {},
        create: { name: shopName, code: shopCode, region, city },
      })
    : ((await prisma.shop.findFirst({ where: { name: shopName, code: null } })) ??
      (await prisma.shop.create({ data: { name: shopName, region, city } })));

  let submittedById: string | undefined;
  if (submitterEmail) {
    const user = await prisma.user.upsert({
      where: { email: submitterEmail },
      update: {},
      create: { email: submitterEmail, name: submitterName || submitterEmail },
    });
    submittedById = user.id;
  }

  const submission = await prisma.submission.create({
    data: {
      shopId: shop.id,
      submittedById,
      imagePath,
      latitude,
      longitude,
      locationLabel,
      status: "PENDING",
    },
  });

  try {
    const [rules, knownBrands] = await Promise.all([getMatrixRules(), getKnownBrands()]);
    const detection = await detectBrandVisibility({
      imageBase64: buffer.toString("base64"),
      mediaType,
      rules,
      knownBrands,
    });
    const brands = mergeByBrand(detection.brands, knownBrands);

    const scored = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: "SCORED",
        aiSummary: detection.overallSummary,
        aiConfidence: detection.confidence,
        brandScores: {
          create: brands.map((b) => {
            const score = computeScore(b.counts, rules).totalScore;
            return {
              brand: b.brand,
              aiCounts: b.counts,
              aiScore: score,
              reasoning: b.reasoning,
              finalCounts: b.counts,
              finalScore: score,
            };
          }),
        },
      },
      include: { shop: true, brandScores: true },
    });

    return NextResponse.json({ submission: scored }, { status: 201 });
  } catch (err) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: { status: "FLAGGED", aiSummary: `AI scoring failed: ${(err as Error).message}` },
    });
    return NextResponse.json(
      {
        submission,
        error:
          "Photo was saved but automatic scoring failed. A reviewer can score it manually.",
      },
      { status: 202 },
    );
  }
}
