/**
 * Helpers for image input to vision models.
 */
import fs from "fs";
import path from "path";

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mime[ext] || "image/jpeg";
}

export function imageToBase64DataUrl(imagePath) {
  const absolutePath = path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(process.cwd(), imagePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image file not found: ${absolutePath}`);
  }
  const buffer = fs.readFileSync(absolutePath);
  const base64 = buffer.toString("base64");
  const mimeType = getMimeType(absolutePath);
  return {
    base64,
    mimeType,
    dataUrl: `data:${mimeType};base64,${base64}`,
  };
}

export function imageBufferToDataUrl(buffer, mimeType) {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}
