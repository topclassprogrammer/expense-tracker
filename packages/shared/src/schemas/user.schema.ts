import { z } from 'zod';

import { CURRENCIES } from '../constants/currencies';

/** Публичное представление пользователя (без passwordHash). */
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  defaultCurrency: z.enum(CURRENCIES),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(60).trim().optional(),
  defaultCurrency: z.enum(CURRENCIES).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(72)
    .regex(/[a-z]/, 'Пароль должен содержать строчную букву')
    .regex(/[A-Z]/, 'Пароль должен содержать заглавную букву')
    .regex(/\d/, 'Пароль должен содержать цифру'),
});

export type User = z.infer<typeof userSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
