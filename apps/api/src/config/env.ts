import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/enayet?schema=quiz_gen"),
  SHADOW_DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  AUTH_TOKEN_SECRET: z.string().min(16).default("local-dev-secret-key"),
  AUTH_TOKEN_TTL_MINUTES: z.coerce.number().positive().default(60),
  AUTH_COOKIE_NAME: z.string().default("quizgen_session"),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().positive().default(30),

  AWS_REGION: z.string().default("ap-south-1"),
  S3_BUCKET_UPLOADS: z.string().default("quizgen-uploads-local"),
  S3_BUCKET_SITE: z.string().default(""),
  S3_SIGN_TTL_SEC: z.coerce.number().default(86400),

  SES_FROM: z.string().email().optional(),
  OPS_ALERT_RECIPIENTS: z.string().optional(),
  INTERNAL_API_BEARER: z.string().optional(),

  SAFETY_FACTOR: z.coerce.number().default(0.8),
  WORKER_CONCURRENCY: z.coerce.number().default(5),

  LLM_INPUT_COST_PER_1K_USD: z.coerce.number().nonnegative().default(0.0007),
  LLM_OUTPUT_COST_PER_1K_USD: z.coerce.number().nonnegative().default(0.0028),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error("Environment validation error:", result.error.flatten().fieldErrors);
    throw new Error("Environment configuration invalid. Check .env values.");
  }

  return result.data;
};

export const env = parseEnv();

