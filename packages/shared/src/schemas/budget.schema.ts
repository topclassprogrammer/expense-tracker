import { z } from 'zod';

import { CURRENCIES, DEFAULT_CURRENCY } from '../constants/currencies';

import { amountSchema } from './common.schema';

/** Период бюджета в формате YYYY-MM. */
export const budgetPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Период должен быть в формате YYYY-MM');

export const budgetSchema = z.object({
  id: z.string(),
  amount: z.string(),
  currency: z.enum(CURRENCIES),
  period: budgetPeriodSchema,
  /** null — общий бюджет на месяц, иначе лимит по конкретной категории. */
  categoryId: z.string().nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createBudgetSchema = z.object({
  amount: amountSchema,
  currency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
  period: budgetPeriodSchema,
  categoryId: z.string().nullish(),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export type Budget = z.infer<typeof budgetSchema>;
export type CreateBudgetDto = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetDto = z.infer<typeof updateBudgetSchema>;
