import cors from "cors";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import { getEnv } from "./config/env.js";
import imageRoutes from "./routes/image.routes.js";

export function createApp(): Express {
  const app = express();
  const env = getEnv();

  app.use(cors());
  app.use(express.json());

  app.use("/uploads", express.static(env.uploadDirAbsolute));
  app.use("/api", imageRoutes);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          error: `File too large. Max size is ${env.MAX_UPLOAD_MB} MB.`,
        });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  });

  return app;
}
