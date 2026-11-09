import { NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { aiEnabled, describeAiError, readShopName } from "@/lib/ai-vision";
import { isSupportedMediaType } from "@/lib/storage";
import { bad } from "@/lib/http";

export async function POST(req: NextRequest) {
  const auth = await apiUser();
  if (auth.error) return auth.error;
  if (!aiEnabled()) return Response.json({ shopName: null, aiDisabled: true });

  const form = await req.formData();
  const image = form.get("image");
  if (!(image instanceof File)) return bad("image file is required");
  if (!isSupportedMediaType(image.type)) return bad(`Unsupported image type: ${image.type}`);

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const shopName = await readShopName({ imageBase64: buffer.toString("base64"), mediaType: image.type });
    return Response.json({ shopName });
  } catch (err) {
    console.error("[shop-name] failed:", err);
    // A distinct status so the form can tell "the AI service failed" apart
    // from "the sign has no readable name".
    return Response.json({ error: describeAiError(err) }, { status: 502 });
  }
}
