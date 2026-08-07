'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateTransactionDto,
  Paginated,
  Transaction,
  TransactionQuery,
  TransactionSummary,
  UpdateTransactionDto,
} from '@expense-tracker/shared';

import { apiClient } from '@/lib/api-client';
import { queryKeys, type TransactionSummaryParams } from '@/lib/query-keys';

export function useTransactions(query: Partial<TransactionQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(query),
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<Transaction>>('/transactions', {
        params: query,
      });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useTransactionSummary(query: TransactionSummaryParams) {
  return useQuery({
    queryKey: queryKeys.transactions.summary(query),
    queryFn: async () => {
      const { data } = await apiClient.get<TransactionSummary>('/transactions/summary', {
        params: query,
      });
      return data;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTransactionDto) => {
      const { data } = await apiClient.post<Transaction>('/transactions', dto);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateTransactionDto & { id: string }) => {
      const { data } = await apiClient.patch<Transaction>(`/transactions/${id}`, dto);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/transactions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
  });
}
