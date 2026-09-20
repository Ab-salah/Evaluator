import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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
 * Saves an uploaded photo to /public/uploads and returns the public URL path
 * (e.g. "/uploads/xyz.jpg") to store on the submission record.
 */
export async function saveSubmissionImage(
  buffer: Buffer,
  mediaType: SupportedMediaType,
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${EXT_BY_MIME[mediaType]}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
