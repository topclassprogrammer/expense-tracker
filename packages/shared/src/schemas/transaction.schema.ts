import { z } from 'zod';

import { CURRENCIES, DEFAULT_CURRENCY } from '../constants/currencies';
import { DEFAULT_TRANSACTION_TYPE, TRANSACTION_TYPES } from '../constants/transaction-types';

import { categorySchema } from './category.schema';
import { amountSchema, paginationQuerySchema, sortOrderSchema } from './common.schema';

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);

export const transactionSchema = z.object({
  id: z.string(),
  amount: z.string(),
  type: transactionTypeSchema,
  currency: z.enum(CURRENCIES),
  date: z.coerce.date(),
  description: z.string().nullable(),
  categoryId: z.string(),
  category: categorySchema.optional(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createTransactionSchema = z.object({
  amount: amountSchema,
  type: transactionTypeSchema.default(DEFAULT_TRANSACTION_TYPE),
  currency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
  date: z.coerce.date().default(() => new Date()),
  description: z.string().max(500).trim().optional(),
  categoryId: z.string().min(1, 'Выберите категорию'),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionQuerySchema = paginationQuerySchema.extend({
  type: transactionTypeSchema.optional(),
  categoryId: z.string().optional(),
  currency: z.enum(CURRENCIES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: sortOrderSchema.default('desc'),
});

/**
 * Обязательный целочисленный параметр query-строки.
 * Голый z.coerce.number() на отсутствующем параметре даёт NaN и сообщение
 * "Expected number, received nan" — union со строкой позволяет задать свой текст.
 */
const requiredQueryInt = (min: number, max: number, message: string) =>
  z
    .union([z.string(), z.number()], { required_error: message, invalid_type_error: message })
    .pipe(z.coerce.number().int().min(min, message).max(max, message));

/** Параметры сводки: месяц и год обязательны. */
export const transactionSummaryQuerySchema = z.object({
  month: requiredQueryInt(1, 12, 'Укажите месяц от 1 до 12'),
  year: requiredQueryInt(2000, 2100, 'Укажите год от 2000 до 2100'),
  currency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
});

export const transactionSummarySchema = z.object({
  month: z.number().int(),
  year: z.number().int(),
  currency: z.enum(CURRENCIES),
  /** Сумма поступлений за период. */
  income: z.string(),
  /** Сумма трат за период. */
  expense: z.string(),
  /** income − expense; может быть отрицательным, поэтому не amountSchema. */
  net: z.string(),
  count: z.number().int(),
  byCategory: z.array(
    z.object({
      categoryId: z.string(),
      categoryName: z.string(),
      color: z.string(),
      type: transactionTypeSchema,
      total: z.string(),
      count: z.number().int(),
      /** Доля внутри своего типа, 0..100. */
      percentage: z.number(),
    }),
  ),
  byDay: z.array(z.object({ date: z.string(), income: z.string(), expense: z.string() })),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
export type TransactionSummaryQuery = z.infer<typeof transactionSummaryQuerySchema>;
export type TransactionSummary = z.infer<typeof transactionSummarySchema>;
