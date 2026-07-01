/**
 * Lab 9: Image upload, vision extraction, pgvector indexing, and search.
 */
import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  buildIndexableContent,
  runImageIndexAgent,
} from "./agents/image-index-agent.js";
import { runImageSearchAgent } from "./agents/image-search-agent.js";
import { insertImage, listImages } from "./lib/db.js";
import { indexImageDocument } from "./lib/image-vector-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");
const clientDist = path.join(__dirname, "public");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/images", async (_req, res) => {
  try {
    const images = await listImages();
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing image file (field name: image)" });
  }

  const imageId = uuidv4();
  const filePath = req.file.path;
  const url = `/uploads/${req.file.filename}`;

  try {
    const extraction = await runImageIndexAgent(filePath);
    const row = await insertImage({
      id: imageId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      url,
      description: extraction.description,
      tags: extraction.tags,
      subjects: extraction.subjects,
      extractedText: extraction.extractedText,
    });

    const pageContent = buildIndexableContent(extraction);
    await indexImageDocument({
      id: imageId,
      pageContent,
      metadata: {
        imageId,
        url,
        filename: req.file.filename,
        originalName: req.file.originalname,
        tags: extraction.tags,
        subjects: extraction.subjects,
      },
    });

    res.status(201).json({
      image: {
        id: row.id,
        url: row.url,
        originalName: row.original_name,
        description: row.description,
        tags: row.tags,
        subjects: row.subjects,
        extractedText: row.extracted_text,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post("/api/search", async (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'query' in body" });
  }

  try {
    const result = await runImageSearchAgent(query, 5);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || String(err) });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Lab 9 image search server on http://localhost:${PORT}`);
});
