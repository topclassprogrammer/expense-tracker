import { z } from 'zod';

/**
 * Схема переменных окружения. Валидируется при старте — приложение
 * не поднимется с неполной конфигурацией.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET должен быть не короче 32 символов'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET должен быть не короче 32 символов'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default('localhost'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Некорректные переменные окружения:\n${issues}`);
  }

  return result.data;
}
