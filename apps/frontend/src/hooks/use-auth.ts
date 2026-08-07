'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import type { AuthResponse, LoginDto, RegisterDto, User } from '@expense-tracker/shared';

import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (dto: LoginDto) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', dto);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      router.push('/');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (dto: RegisterDto) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/register', dto);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      router.push('/');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clear = useAuthStore((state) => state.clear);

  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSettled: () => {
      clear();
      queryClient.clear();
      router.push('/login');
    },
  });
}

/** Профиль текущего пользователя; запрос идёт только при наличии access-токена. */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const { data } = await apiClient.get<User>('/users/me');
      return data;
    },
    enabled: isAuthenticated,
  });
}
