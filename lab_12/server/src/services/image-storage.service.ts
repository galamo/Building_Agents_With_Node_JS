import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getEnv } from "../config/env.js";
import { ALLOWED_IMAGE_EXTENSIONS } from "../utils/vision.js";

export type SavedImage = {
  id: string;
  originalFilename: string;
  storedFilename: string;
  absolutePath: string;
  imageUrl: string;
  mimeType: string;
  sizeBytes: number;
};

export class ImageStorageService {
  constructor() {
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    const { uploadDirAbsolute } = getEnv();
    if (!fs.existsSync(uploadDirAbsolute)) {
      fs.mkdirSync(uploadDirAbsolute, { recursive: true });
    }
  }

  getUploadDir(): string {
    return getEnv().uploadDirAbsolute;
  }

  buildStoredFilename(originalFilename: string, id = uuidv4()): string {
    const ext = path.extname(originalFilename).toLowerCase();
    const safeExt = ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : ".jpg";
    return `${id}${safeExt}`;
  }

  saveUploadedFile(file: {
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
  }): SavedImage {
    const storedFilename = file.filename;
    const id = path.parse(storedFilename).name;
    const absolutePath = path.join(this.getUploadDir(), storedFilename);
    const imageUrl = `/uploads/${storedFilename}`;

    return {
      id,
      originalFilename: file.originalname,
      storedFilename,
      absolutePath,
      imageUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  deleteFile(storedFilename: string): void {
    const absolutePath = path.join(this.getUploadDir(), storedFilename);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
}

let imageStorageService: ImageStorageService | null = null;

export function getImageStorageService(): ImageStorageService {
  if (!imageStorageService) {
    imageStorageService = new ImageStorageService();
  }
  return imageStorageService;
}
