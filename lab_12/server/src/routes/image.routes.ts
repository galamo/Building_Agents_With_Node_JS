import path from "path";
import { Router } from "express";
import multer from "multer";
import { getEnv } from "../config/env.js";
import {
  healthCheck,
  searchImages,
  uploadImage,
} from "../controllers/image.controller.js";
import { getImageStorageService } from "../services/image-storage.service.js";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIMES,
} from "../utils/vision.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getImageStorageService().getUploadDir());
  },
  filename: (_req, file, cb) => {
    cb(null, getImageStorageService().buildStoredFilename(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: getEnv().maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      !ALLOWED_IMAGE_MIMES.has(file.mimetype) &&
      !ALLOWED_IMAGE_EXTENSIONS.has(ext)
    ) {
      return cb(new Error("Only png, jpg, jpeg, and webp images are allowed"));
    }
    cb(null, true);
  },
});

router.get("/health", healthCheck);
router.post("/images/upload", upload.single("image"), uploadImage);
router.get("/images/search", searchImages);

export default router;
