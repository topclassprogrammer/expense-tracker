'use client';

import { loginSchema, type LoginDto } from '@expense-tracker/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-auth';

export default function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onError: () => toast.error('Не удалось войти. Проверьте email и пароль.'),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>Войдите, чтобы вести учёт расходов</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? 'Входим…' : 'Войти'}
          </Button>

          <p className="text-muted-foreground text-center text-sm">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-foreground underline underline-offset-4">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
