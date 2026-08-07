import { Inter } from 'next/font/google';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';

import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Трекер расходов',
  description: 'Учёт личных расходов: категории, бюджеты и аналитика',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
