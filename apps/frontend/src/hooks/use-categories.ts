'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Category, CreateCategoryDto, UpdateCategoryDto } from '@expense-tracker/shared';

import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useCategories(includeDefaults = true) {
  return useQuery({
    queryKey: queryKeys.categories.list(includeDefaults),
    queryFn: async () => {
      const { data } = await apiClient.get<Category[]>('/categories', {
        params: { includeDefaults },
      });
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCategoryDto) => {
      const { data } = await apiClient.post<Category>('/categories', dto);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateCategoryDto & { id: string }) => {
      const { data } = await apiClient.patch<Category>(`/categories/${id}`, dto);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() }),
  });
}
