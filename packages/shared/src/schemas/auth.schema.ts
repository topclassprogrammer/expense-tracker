import { z } from 'zod';

import { userSchema } from './user.schema';

export const passwordSchema = z
  .string()
  .min(8, 'Пароль должен содержать минимум 8 символов')
  .max(72, 'Пароль не должен превышать 72 символа')
  .regex(/[a-z]/, 'Пароль должен содержать строчную букву')
  .regex(/[A-Z]/, 'Пароль должен содержать заглавную букву')
  .regex(/\d/, 'Пароль должен содержать цифру');

export const registerSchema = z.object({
  email: z.string().email('Некорректный email').toLowerCase().trim(),
  password: passwordSchema,
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(60).trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email').toLowerCase().trim(),
  password: z.string().min(1, 'Введите пароль'),
});

/** Ответ на регистрацию/логин/refresh: refresh-токен уходит в httpOnly cookie. */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Полезная нагрузка access-токена. */
export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
