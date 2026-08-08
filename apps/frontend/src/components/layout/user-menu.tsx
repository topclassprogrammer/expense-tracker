'use client';

import { LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';

/** Инициалы из имени: «Иван Петров» → «ИП», односложное имя → первая буква. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserMenu() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  if (!user) {
    return isLoading ? <Skeleton className="h-8 w-32" /> : null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <span
            className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-xs font-medium"
            aria-hidden
          >
            {initialsOf(user.name)}
          </span>
          <span className="hidden max-w-40 truncate sm:inline">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          {user.name}
          <span className="text-muted-foreground text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Настройки
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={logout.isPending}
          onSelect={(event) => {
            // Меню закрылось бы раньше, чем уйдёт запрос выхода
            event.preventDefault();
            logout.mutate();
          }}
        >
          <LogOut />
          {logout.isPending ? 'Выходим…' : 'Выйти'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
