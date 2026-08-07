import type { ExpenseQuery, ExpenseSummaryQuery } from '@expense-tracker/shared';

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
  expenses: {
    all: () => ['expenses'] as const,
    list: (query: Partial<ExpenseQuery>) => ['expenses', 'list', query] as const,
    detail: (id: string) => ['expenses', 'detail', id] as const,
    summary: (query: Partial<ExpenseSummaryQuery>) => ['expenses', 'summary', query] as const,
  },
} as const;
