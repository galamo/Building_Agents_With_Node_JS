import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  OPENROUTER_BASE_URL: z
    .string()
    .url()
    .default("https://openrouter.ai/api/v1"),
  OPENROUTER_VISION_MODEL: z.string().default("openai/gpt-4o-mini"),
  OPENROUTER_RERANKER_MODEL: z.string().default("openai/gpt-4o-mini"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  EMBEDDING_DIMENSION: z.coerce.number().default(1536),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().default(10),
});

export type Env = z.infer<typeof envSchema> & {
  uploadDirAbsolute: string;
  maxUploadBytes: number;
};

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const serverRoot = path.resolve(__dirname, "../..");
  const uploadDirAbsolute = path.isAbsolute(parsed.data.UPLOAD_DIR)
    ? parsed.data.UPLOAD_DIR
    : path.join(serverRoot, parsed.data.UPLOAD_DIR);

  cachedEnv = {
    ...parsed.data,
    uploadDirAbsolute,
    maxUploadBytes: parsed.data.MAX_UPLOAD_MB * 1024 * 1024,
  };

  return cachedEnv;
}
