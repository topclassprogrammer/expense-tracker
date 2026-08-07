'use client';

import { formatMoney, type Currency } from '@expense-tracker/shared';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactionSummary } from '@/hooks/use-transactions';

const now = new Date();

export default function DashboardPage() {
  const { data, isLoading } = useTransactionSummary({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const currency = (data?.currency ?? 'RUB') as Currency;
  const expenseByCategory = data?.byCategory.filter((item) => item.type === 'EXPENSE') ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Дашборд</h1>
        <p className="text-muted-foreground text-sm">Сводка операций за текущий месяц</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Доходы</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? '—' : formatMoney(data?.income ?? '0', currency)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Расходы</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? '—' : formatMoney(data?.expense ?? '0', currency)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Баланс</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? '—' : formatMoney(data?.net ?? '0', currency)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Операций</CardDescription>
            <CardTitle className="text-2xl">{isLoading ? '—' : (data?.count ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>По категориям</CardTitle>
          <CardDescription>Распределение расходов текущего месяца</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground text-sm">Загрузка…</p>}

          {!isLoading && !expenseByCategory.length && (
            <p className="text-muted-foreground text-sm">
              Расходов пока нет — добавьте первый на странице «Расходы».
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {expenseByCategory.map((item) => (
              <li key={item.categoryId} className="flex items-center gap-3">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="flex-1 truncate text-sm">{item.categoryName}</span>
                <span className="text-muted-foreground text-sm">{item.percentage}%</span>
                <span className="w-28 text-right text-sm font-medium">
                  {formatMoney(item.total, currency)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
