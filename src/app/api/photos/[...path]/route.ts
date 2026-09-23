import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { PHOTO_PREFIX } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const pathname = (await params).path.join("/");
  if (!pathname.startsWith(PHOTO_PREFIX)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      // Photo paths are random UUIDs and never overwritten, so they can be cached forever.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
