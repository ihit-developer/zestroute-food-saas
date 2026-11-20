import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().default(process.env.MONGO_URI ?? ''),
  MONGODB_DB_NAME: z.string().default('food_delivery_platform'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16)
    .default('dev_only_access_secret_replace_in_production_64chars'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default('dev_only_refresh_secret_replace_in_production_64chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  PASSWORD_PEPPER: z.string().default(''),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174,http://localhost:8081,http://localhost:8082'),
  STORAGE_PROVIDER: z.enum(['cloudinary', 's3']).default('cloudinary'),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  S3_BUCKET: z.string().default(''),
  S3_REGION: z.string().default(''),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_ENDPOINT: z.string().default(''),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && !parsed.data.MONGODB_URI) {
  throw new Error('MONGODB_URI is required in production');
}

export const env = parsed.data;
