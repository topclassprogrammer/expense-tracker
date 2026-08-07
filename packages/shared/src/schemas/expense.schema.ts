import { z } from 'zod';

import { CURRENCIES, DEFAULT_CURRENCY } from '../constants/currencies';

import { categorySchema } from './category.schema';
import { paginationQuerySchema, sortOrderSchema } from './common.schema';

/**
 * Сумма передаётся строкой: Prisma отдаёт Decimal(12,2), и строка
 * защищает от потери точности при сериализации в JSON.
 */
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toFixed(2) : value))
  .refine((value) => /^\d{1,10}(\.\d{1,2})?$/.test(value), 'Некорректная сумма')
  .refine((value) => Number(value) > 0, 'Сумма должна быть больше нуля');

export const expenseSchema = z.object({
  id: z.string(),
  amount: z.string(),
  currency: z.enum(CURRENCIES),
  date: z.coerce.date(),
  note: z.string().nullable(),
  categoryId: z.string(),
  category: categorySchema.optional(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createExpenseSchema = z.object({
  amount: amountSchema,
  currency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
  date: z.coerce.date().default(() => new Date()),
  note: z.string().max(500).trim().optional(),
  categoryId: z.string().min(1, 'Выберите категорию'),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().optional(),
  currency: z.enum(CURRENCIES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: sortOrderSchema.default('desc'),
});

/** Параметры сводки: период агрегации. */
export const expenseSummaryQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  currency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
});

export const expenseSummarySchema = z.object({
  total: z.string(),
  currency: z.enum(CURRENCIES),
  count: z.number().int(),
  byCategory: z.array(
    z.object({
      categoryId: z.string(),
      categoryName: z.string(),
      color: z.string(),
      total: z.string(),
      count: z.number().int(),
      /** Доля от общей суммы, 0..100. */
      percentage: z.number(),
    }),
  ),
  byDay: z.array(z.object({ date: z.string(), total: z.string() })),
});

export type Expense = z.infer<typeof expenseSchema>;
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
export type ExpenseSummaryQuery = z.infer<typeof expenseSummaryQuerySchema>;
export type ExpenseSummary = z.infer<typeof expenseSummarySchema>;
