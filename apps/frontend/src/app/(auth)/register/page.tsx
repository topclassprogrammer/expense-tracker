'use client';

import { registerSchema, type RegisterDto } from '@expense-tracker/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/hooks/use-auth';

export default function RegisterPage() {
  const signUp = useRegister();
  const [agreed, setAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDto>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) => {
    if (!agreed) {
      setAgreementError(true);
      return;
    }

    signUp.mutate(values, {
      onError: () => toast.error('Не удалось зарегистрироваться. Возможно, email уже занят.'),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт для учёта расходов</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" autoComplete="name" {...register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

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
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="agreement"
                checked={agreed}
                aria-invalid={agreementError}
                className="mt-0.5"
                onCheckedChange={(checked) => {
                  setAgreed(checked === true);
                  if (checked === true) setAgreementError(false);
                }}
              />
              <Label
                htmlFor="agreement"
                className="text-muted-foreground inline leading-snug font-normal"
              >
                Согласен с{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-foreground underline underline-offset-4"
                >
                  пользовательским соглашением
                </Link>{' '}
                и{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-foreground underline underline-offset-4"
                >
                  политикой обработки данных
                </Link>
              </Label>
            </div>
            {agreementError && (
              <p className="text-destructive text-sm">
                Необходимо согласиться с условиями для продолжения
              </p>
            )}
          </div>

          <Button type="submit" disabled={signUp.isPending}>
            {signUp.isPending ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
          </Button>

          <p className="text-muted-foreground text-center text-sm">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Войти
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
