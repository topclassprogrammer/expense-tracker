'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateExpenseDto,
  Expense,
  ExpenseQuery,
  ExpenseSummary,
  ExpenseSummaryQuery,
  Paginated,
  UpdateExpenseDto,
} from '@expense-tracker/shared';

import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useExpenses(query: Partial<ExpenseQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.expenses.list(query),
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<Expense>>('/expenses', { params: query });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useExpenseSummary(query: Partial<ExpenseSummaryQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.expenses.summary(query),
    queryFn: async () => {
      const { data } = await apiClient.get<ExpenseSummary>('/expenses/summary', { params: query });
      return data;
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateExpenseDto) => {
      const { data } = await apiClient.post<Expense>('/expenses', dto);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() }),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateExpenseDto & { id: string }) => {
      const { data } = await apiClient.patch<Expense>(`/expenses/${id}`, dto);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/expenses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() }),
  });
}
