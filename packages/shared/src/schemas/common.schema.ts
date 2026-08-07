import { z } from 'zod';

/** Идентификатор сущности (cuid). */
export const idSchema = z.string().cuid();

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
