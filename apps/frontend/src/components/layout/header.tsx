'use client';

import { UserMenu } from './user-menu';

export function Header() {
  return (
    <header className="bg-background flex h-14 items-center justify-end border-b px-6">
      <UserMenu />
    </header>
  );
}
