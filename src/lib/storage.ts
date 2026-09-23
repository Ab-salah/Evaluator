import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} satisfies Record<string, string>;

export type SupportedMediaType = keyof typeof EXT_BY_MIME;

export function isSupportedMediaType(mime: string): mime is SupportedMediaType {
  return mime in EXT_BY_MIME;
}

/**
 * Uploads a submitted photo to Vercel Blob storage and returns its public
 * URL to store on the submission record. Blob storage (not local disk) is
 * required because the app runs on serverless functions with no persistent
 * filesystem between requests.
 */
export async function saveSubmissionImage(
  buffer: Buffer,
  mediaType: SupportedMediaType,
): Promise<string> {
  const filename = `submissions/${randomUUID()}.${EXT_BY_MIME[mediaType]}`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: mediaType,
  });
  return blob.url;
}
