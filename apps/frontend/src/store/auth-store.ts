import { create } from 'zustand';

import type { User } from '@expense-tracker/shared';

interface AuthState {
  /** Access-токен живёт только в памяти: в localStorage он был бы уязвим к XSS. */
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, user: User) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null, isAuthenticated: false }),
}));
