'use client';

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';

export function Header() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="bg-background flex h-14 items-center justify-between border-b px-6">
      <span className="text-muted-foreground text-sm">{user?.name ?? '—'}</span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Выйти"
      >
        <LogOut className="size-4" />
        Выйти
      </Button>
    </header>
  );
}
