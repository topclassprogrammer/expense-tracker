import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика обработки данных — Трекер расходов',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Политика обработки персональных данных</h1>

      <p className="text-muted-foreground text-sm">
        Сервис «Трекер расходов» собирает и хранит только те данные, которые необходимы для
        работы приложения: email, имя пользователя и сведения о расходах, которые вы вносите
        самостоятельно.
      </p>

      <p className="text-muted-foreground text-sm">
        Пароль хранится в виде необратимого хеша и никогда не передаётся третьим лицам. Данные
        не передаются сторонним сервисам без вашего согласия и используются исключительно для
        предоставления функциональности сервиса.
      </p>

      <Link href="/register" className="text-foreground text-sm underline underline-offset-4">
        Назад к регистрации
      </Link>
    </main>
  );
}
