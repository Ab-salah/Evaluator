import type { PercentCrop } from "react-image-crop";

// Long edge of the photo sent for scoring. Keeps storefront signage legible
// while staying well under Vercel's 4.5MB request limit and Claude's 5MB
// per-image limit.
const OUTPUT_MAX = 1600;
// Long edge of the working copy shown in the crop editor. Caps memory use on
// phones, whose raw photos can be 12+ megapixels.
const WORKING_MAX = 3000;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process the photo."))),
      "image/jpeg",
      quality,
    ),
  );
}

/**
 * Decodes a picked photo (honouring the camera's orientation tag), rotates
 * it by quarter turns and returns an object URL of the result for the crop
 * editor to display.
 */
export async function renderRotated(file: File, quarterTurns: number): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, WORKING_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const turns = ((quarterTurns % 4) + 4) % 4;
  const sideways = turns % 2 === 1;

  const canvas = document.createElement("canvas");
  canvas.width = sideways ? h : w;
  canvas.height = sideways ? w : h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process images.");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turns * Math.PI) / 2);
  ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
  bitmap.close();

  return URL.createObjectURL(await canvasToBlob(canvas, 0.92));
}

/** Cuts the cropped region out of the editor's image and encodes it for upload. */
export async function exportCrop(image: HTMLImageElement, crop: PercentCrop): Promise<File> {
  const sx = (crop.x / 100) * image.naturalWidth;
  const sy = (crop.y / 100) * image.naturalHeight;
  const sw = (crop.width / 100) * image.naturalWidth;
  const sh = (crop.height / 100) * image.naturalHeight;
  if (sw < 1 || sh < 1) throw new Error("The crop area is empty — drag to select part of the photo.");

  const scale = Math.min(1, OUTPUT_MAX / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process images.");
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return new File([await canvasToBlob(canvas, 0.85)], "shop.jpg", { type: "image/jpeg" });
}
