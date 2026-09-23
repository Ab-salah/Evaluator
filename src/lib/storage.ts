import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} satisfies Record<string, string>;

export type SupportedMediaType = keyof typeof EXT_BY_MIME;

export const PHOTO_PREFIX = "submissions/";

export function isSupportedMediaType(mime: string): mime is SupportedMediaType {
  return mime in EXT_BY_MIME;
}

/**
 * Uploads a submitted photo to the (private) Vercel Blob store and returns
 * the app path it is served from. Shop photos are research data, so they are
 * not publicly addressable; /api/photos streams them back with the server's
 * token.
 */
export async function saveSubmissionImage(
  buffer: Buffer,
  mediaType: SupportedMediaType,
): Promise<string> {
  const pathname = `${PHOTO_PREFIX}${randomUUID()}.${EXT_BY_MIME[mediaType]}`;
  await put(pathname, buffer, { access: "private", contentType: mediaType });
  return `/api/photos/${pathname}`;
}
