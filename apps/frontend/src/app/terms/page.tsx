import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Пользовательское соглашение — Трекер расходов',
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Пользовательское соглашение</h1>

      <p className="text-muted-foreground text-sm">
        Настоящее соглашение регулирует условия использования сервиса «Трекер расходов».
        Регистрируясь в сервисе, вы подтверждаете, что ознакомились с условиями и принимаете их.
      </p>

      <p className="text-muted-foreground text-sm">
        Сервис предоставляется «как есть» для учёта личных расходов. Администрация вправе
        изменять функциональность и условия использования, уведомляя пользователей об
        изменениях в интерфейсе сервиса.
      </p>

      <Link href="/register" className="text-foreground text-sm underline underline-offset-4">
        Назад к регистрации
      </Link>
    </main>
  );
}
