import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

import type { AuthResponse } from '@expense-tracker/shared';

import { useAuthStore } from '@/store/auth-store';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL,
  // Нужно, чтобы браузер отправлял httpOnly refresh-cookie
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Пока идёт обновление токена, параллельные 401-запросы встают в очередь
 * и повторяются после получения нового access-токена — иначе каждый из них
 * дёрнул бы /auth/refresh и сломал ротацию refresh-токена на сервере.
 */
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (error.response?.status !== 401 || !original || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshPromise ??= refreshAccessToken();
      const accessToken = await refreshPromise;

      original.headers = { ...original.headers, Authorization: `Bearer ${accessToken}` };
      return await apiClient(original);
    } catch (refreshError) {
      useAuthStore.getState().clear();

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);

async function refreshAccessToken(): Promise<string> {
  const { data } = await axios.post<AuthResponse>(
    `${baseURL}/auth/refresh`,
    {},
    { withCredentials: true },
  );

  useAuthStore.getState().setAuth(data.accessToken, data.user);
  return data.accessToken;
}
