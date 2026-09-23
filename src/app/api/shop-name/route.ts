import { NextRequest, NextResponse } from "next/server";
import { readShopName } from "@/lib/ai-vision";
import { isSupportedMediaType } from "@/lib/storage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const image = form.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image file is required" }, { status: 400 });
  }
  const mediaType = image.type;
  if (!isSupportedMediaType(mediaType)) {
    return NextResponse.json({ error: `Unsupported image type: ${mediaType}` }, { status: 400 });
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  try {
    const shopName = await readShopName({ imageBase64: buffer.toString("base64"), mediaType });
    return NextResponse.json({ shopName });
  } catch (err) {
    // Surfaced as a distinct status so the submit form can tell "the AI
    // service failed" apart from "the sign genuinely has no readable name".
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
