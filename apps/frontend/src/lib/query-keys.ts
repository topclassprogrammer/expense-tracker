import type { Currency, TransactionQuery } from '@expense-tracker/shared';

/**
 * Параметры сводки типизированы вручную, а не через Partial<TransactionSummaryQuery>:
 * month и year обязательны на бэкенде, и Partial<> спрятал бы их пропуск от
 * тайпчека, оставив ошибку 400 на рантайм.
 */
export interface TransactionSummaryParams {
  month: number;
  year: number;
  currency?: Currency;
}

/** Единая фабрика ключей кэша TanStack Query. */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  categories: {
    all: () => ['categories'] as const,
    list: (includeDefaults: boolean) => ['categories', 'list', { includeDefaults }] as const,
    detail: (id: string) => ['categories', 'detail', id] as const,
  },
  transactions: {
    all: () => ['transactions'] as const,
    list: (query: Partial<TransactionQuery>) => ['transactions', 'list', query] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
    summary: (query: TransactionSummaryParams) => ['transactions', 'summary', query] as const,
  },
} as const;
