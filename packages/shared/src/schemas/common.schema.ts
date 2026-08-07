import { z } from 'zod';

/** Идентификатор сущности (cuid). */
export const idSchema = z.string().cuid();

/**
 * Сумма передаётся строкой: Prisma отдаёт Decimal(12,2), и строка
 * защищает от потери точности при сериализации в JSON.
 *
 * Живёт здесь, а не в схеме конкретного домена: используется и транзакциями,
 * и бюджетами, а импорт между доменными схемами создавал бы лишнюю связность.
 */
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toFixed(2) : value))
  .refine((value) => /^\d{1,10}(\.\d{1,2})?$/.test(value), 'Некорректная сумма')
  .refine((value) => Number(value) > 0, 'Сумма должна быть больше нуля');

/** Параметры постраничной выборки. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof sortOrderSchema>;

/** Обёртка постраничного ответа API. */
export interface Paginated<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Тело ошибки, возвращаемое глобальным фильтром исключений. */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  path: string;
  timestamp: string;
}
