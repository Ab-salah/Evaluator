import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeScore } from "@/lib/scoring";
import { detectVisibilityElements } from "@/lib/ai-vision";
import { isSupportedMediaType, saveSubmissionImage } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  const submissions = await prisma.submission.findMany({
    where: {
      shopId,
      status: status ? (status as never) : undefined,
    },
    include: { shop: true, submittedBy: true },
    orderBy: [{ finalScore: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ submissions });
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
    const detection = await detectVisibilityElements({
      imageBase64: buffer.toString("base64"),
      mediaType,
    });
    const breakdown = computeScore(detection.counts);

    const scored = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: "SCORED",
        aiElements: {
          counts: detection.counts,
          reasoning: detection.reasoning,
          confidence: detection.confidence,
        },
        aiScore: breakdown.totalScore,
        aiSummary: detection.overallSummary,
        finalElements: { counts: detection.counts },
        finalScore: breakdown.totalScore,
      },
      include: { shop: true, submittedBy: true },
    });

    return NextResponse.json({ submission: scored, breakdown }, { status: 201 });
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
