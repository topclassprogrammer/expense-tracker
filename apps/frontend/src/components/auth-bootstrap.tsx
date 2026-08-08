'use client';

import { useEffect, useRef } from 'react';

import { restoreSession } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

/**
 * Поднимает сессию из refresh-cookie при первой загрузке приложения.
 * Без этого после F5 стор пуст, useCurrentUser выключен своим enabled,
 * и авторизованный пользователь видит пустой профиль до первого 401.
 * Рендер не блокируем: запросы всё равно доедут через ретрай интерсептора.
 */
export function AuthBootstrap() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const attempted = useRef(false);

  useEffect(() => {
    if (isAuthenticated || attempted.current) return;

    attempted.current = true;
    void restoreSession();
  }, [isAuthenticated]);

  return null;
}
