import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai-vision";
import { isSupportedMediaType, saveSubmissionImage } from "@/lib/storage";
import { scoreSubmission, UNNAMED_SHOP } from "@/lib/scoring-job";
import { bad } from "@/lib/http";

function optionalCoordinate(value: FormDataEntryValue | null, limit: number): number | undefined | null {
  if (value === null || String(value).trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || undefined;

/**
 * Saves the photo and answers straight away; AI scoring runs in the
 * background (after the response) so a rep can move on to the next shop.
 * The audit page polls until the score lands.
 */
export async function POST(req: NextRequest) {
  const auth = await apiUser();
  if (auth.error) return auth.error;

  const form = await req.formData();
  const shopName = text(form, "shopName");
  const shopCode = text(form, "shopCode");
  const region = text(form, "region");
  const city = text(form, "city");
  const locationLabel = text(form, "locationLabel");
  const latitude = optionalCoordinate(form.get("latitude"), 90);
  const longitude = optionalCoordinate(form.get("longitude"), 180);
  const image = form.get("image");

  if (!shopName && !aiEnabled()) return bad("Enter the shop's name.");
  if (latitude === null || longitude === null) return bad("latitude/longitude must be valid coordinates");
  if (!(image instanceof File)) return bad("Add a photo of the shop front.");
  if (!isSupportedMediaType(image.type)) return bad(`Unsupported image type: ${image.type}. Use JPEG, PNG or WebP.`);

  const imagePath = await saveSubmissionImage(Buffer.from(await image.arrayBuffer()), image.type);

  const name = shopName ?? UNNAMED_SHOP;
  const shop = shopCode
    ? await prisma.shop.upsert({ where: { code: shopCode }, update: {}, create: { name, code: shopCode, region, city } })
    : shopName
      ? ((await prisma.shop.findFirst({ where: { name: { equals: shopName, mode: "insensitive" }, code: null } })) ??
        (await prisma.shop.create({ data: { name, region, city } })))
      : await prisma.shop.create({ data: { name, region, city } });

  const submission = await prisma.submission.create({
    data: {
      shopId: shop.id,
      submittedById: auth.user.id,
      imagePath,
      latitude,
      longitude,
      locationLabel,
      status: "PENDING",
    },
  });

  after(() => scoreSubmission(submission.id));

  return Response.json({ submission: { id: submission.id } }, { status: 201 });
}
