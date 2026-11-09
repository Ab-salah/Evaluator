import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} satisfies Record<string, string>;

const MIME_BY_EXT: Record<string, SupportedMediaType> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type SupportedMediaType = keyof typeof EXT_BY_MIME;

export const PHOTO_PREFIX = "submissions/";
const URL_PREFIX = "/api/photos/";

// Photos live on local disk (a Docker volume in production). They are shop
// research data, so they are never served statically: /api/photos streams
// them to signed-in users only.
const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads"));

export function isSupportedMediaType(mime: string): mime is SupportedMediaType {
  return mime in EXT_BY_MIME;
}

/** Saves a submitted photo and returns the app URL it is served from. */
export async function saveSubmissionImage(buffer: Buffer, mediaType: SupportedMediaType): Promise<string> {
  const pathname = `${PHOTO_PREFIX}${randomUUID()}.${EXT_BY_MIME[mediaType]}`;
  const file = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, pathname);
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ file, buffer);
  return `${URL_PREFIX}${pathname}`;
}

/**
 * Reads a stored photo by its storage pathname ("submissions/<uuid>.jpg")
 * or by its app URL. Returns null for anything outside the photo folder.
 */
export async function readSubmissionImage(
  pathnameOrUrl: string,
): Promise<{ buffer: Buffer; mediaType: SupportedMediaType } | null> {
  const pathname = pathnameOrUrl.startsWith(URL_PREFIX)
    ? pathnameOrUrl.slice(URL_PREFIX.length)
    : pathnameOrUrl;
  if (!/^submissions\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(pathname)) return null;

  const file = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, pathname);
  // Belt and braces against path traversal, on top of the strict pattern.
  if (!file.startsWith(UPLOAD_DIR + path.sep)) return null;

  try {
    const buffer = await readFile(/*turbopackIgnore: true*/ file);
    const ext = pathname.split(".").pop()!;
    return { buffer, mediaType: MIME_BY_EXT[ext] };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Removes a stored photo; a file that is already gone is not an error. */
export async function deleteSubmissionImage(pathnameOrUrl: string): Promise<void> {
  const pathname = pathnameOrUrl.startsWith(URL_PREFIX) ? pathnameOrUrl.slice(URL_PREFIX.length) : pathnameOrUrl;
  if (!/^submissions\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(pathname)) return;
  await unlink(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, pathname)).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "ENOENT") throw err;
  });
}
