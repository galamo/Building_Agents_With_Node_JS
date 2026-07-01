import type { Request, Response, NextFunction } from "express";
import { getEmbeddingService } from "../services/openrouter-embedding.service.js";
import { getImageIndexingAgentService } from "../services/image-indexing-agent.service.js";
import { getImageSearchService } from "../services/image-search.service.js";
import {
  getImageStorageService,
  type SavedImage,
} from "../services/image-storage.service.js";
import { getPgVectorService } from "../services/pgvector.service.js";
import type { UploadImageResponse } from "../types/image-rag.types.js";

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export async function uploadImage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let saved: SavedImage | null = null;

  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing image file (field name: image)" });
      return;
    }

    const storage = getImageStorageService();
    saved = storage.saveUploadedFile(req.file);

    const index = await getImageIndexingAgentService().analyzeImage(
      saved.absolutePath
    );
    const embedding = await getEmbeddingService().embedText(index.indexedText);

    const row = await getPgVectorService().insertImageDocument({
      id: saved.id,
      originalFilename: saved.originalFilename,
      storedFilename: saved.storedFilename,
      imageUrl: saved.imageUrl,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      index,
      embedding,
    });

    const response: UploadImageResponse = {
      image: {
        id: row.id,
        imageUrl: row.image_url,
        title: row.title ?? index.title,
        description: row.description ?? index.description,
        tags: parseJsonArray(row.tags),
        objects: parseJsonArray(row.objects),
      },
    };

    res.status(201).json(response);
  } catch (err) {
    if (saved) {
      getImageStorageService().deleteFile(saved.storedFilename);
    }
    next(err);
  }
}

export async function searchImages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    if (!query.trim()) {
      res.status(400).json({ error: "Search query 'q' is required" });
      return;
    }

    const result = await getImageSearchService().search(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function healthCheck(_req: Request, res: Response): void {
  res.json({ ok: true });
}
