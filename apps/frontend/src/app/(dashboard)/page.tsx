'use client';

import { currentPeriod, formatMoney, monthRange, type Currency } from '@expense-tracker/shared';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpenseSummary } from '@/hooks/use-expenses';

export default function DashboardPage() {
  const { from, to } = monthRange(currentPeriod());
  const { data, isLoading } = useExpenseSummary({ dateFrom: from, dateTo: to });

  const currency = (data?.currency ?? 'RUB') as Currency;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Дашборд</h1>
        <p className="text-muted-foreground text-sm">Сводка расходов за текущий месяц</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Всего за месяц</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? '—' : formatMoney(data?.total ?? '0', currency)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Операций</CardDescription>
            <CardTitle className="text-2xl">{isLoading ? '—' : (data?.count ?? 0)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Категорий задействовано</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? '—' : (data?.byCategory.length ?? 0)}
            </CardTitle>
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

          {!isLoading && !data?.byCategory.length && (
            <p className="text-muted-foreground text-sm">
              Расходов пока нет — добавьте первый на странице «Расходы».
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {data?.byCategory.map((item) => (
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
