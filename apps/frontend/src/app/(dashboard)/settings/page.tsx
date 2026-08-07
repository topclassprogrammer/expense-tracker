'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-auth';

export default function SettingsPage() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="text-muted-foreground text-sm">Профиль и валюта по умолчанию</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>Данные учётной записи</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {isLoading && <p className="text-muted-foreground">Загрузка…</p>}

          {user && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Имя</span>
                <span>{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Валюта по умолчанию</span>
                <span>{user.defaultCurrency}</span>
              </div>
            </>
          )}

          {/* TODO: форма изменения профиля и смены пароля */}
        </CardContent>
      </Card>
    </div>
  );
}
