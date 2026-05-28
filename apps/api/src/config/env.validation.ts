import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(10),
  REDIS_URL: z.string().min(10),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  SES_FROM_EMAIL: z.string().email().optional(),
  APP_URL: z.string().min(1).default('http://localhost:3000'),
  API_URL: z.string().min(1).default('http://localhost:3001'),
  TRACKING_URL: z.string().min(1).default('http://localhost:3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  MAX_DAILY_SENDS_FREE: z.coerce.number().default(500),
  MAX_DAILY_SENDS_STARTER: z.coerce.number().default(10000),
  MAX_DAILY_SENDS_PRO: z.coerce.number().default(100000),
});

export default function envValidation(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Variáveis de ambiente inválidas: ${result.error.message}`);
  }
  return result.data;
}
