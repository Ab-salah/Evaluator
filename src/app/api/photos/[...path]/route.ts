import { NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { readSubmissionImage } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const auth = await apiUser();
  if (auth.error) return auth.error;

  const image = await readSubmissionImage((await params).path.join("/"));
  if (!image) return Response.json({ error: "Not found" }, { status: 404 });

  return new Response(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.mediaType,
      // Photo paths are random UUIDs and never overwritten.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
