'use client';

import { formatMoney, type Currency } from '@expense-tracker/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories } from '@/hooks/use-categories';
import { useTransactions } from '@/hooks/use-transactions';
import { cn } from '@/lib/utils';

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data, isLoading } = useTransactions({ page, limit: 20, categoryId });
  const { data: categories } = useCategories();

  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Расходы</h1>
          <p className="text-muted-foreground text-sm">История операций с фильтрами</p>
        </div>
        {/* TODO: диалог создания расхода */}
        <Button disabled>Добавить расход</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Категория и период</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant={categoryId ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => {
              setCategoryId(undefined);
              setPage(1);
            }}
          >
            Все
          </Button>

          {categories?.map((category) => (
            <Button
              key={category.id}
              variant={categoryId === category.id ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryId(category.id);
                setPage(1);
              }}
            >
              {category.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2">
          {isLoading && <p className="text-muted-foreground text-sm">Загрузка…</p>}

          {!isLoading && !data?.items.length && (
            <p className="text-muted-foreground text-sm">Расходов за выбранный фильтр нет.</p>
          )}

          {data?.items.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center gap-3 border-b py-3 last:border-b-0"
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: transaction.category?.color ?? '#64748b' }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{transaction.category?.name ?? '—'}</p>
                {transaction.description && (
                  <p className="text-muted-foreground truncate text-xs">
                    {transaction.description}
                  </p>
                )}
              </div>
              <span className="text-muted-foreground text-sm">
                {format(new Date(transaction.date), 'd MMM yyyy', { locale: ru })}
              </span>
              <span
                className={cn(
                  'w-28 text-right text-sm font-medium',
                  transaction.type === 'INCOME' && 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {transaction.type === 'INCOME' ? '+' : '−'}
                {formatMoney(transaction.amount, transaction.currency as Currency)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Назад
          </Button>
          <span className="text-muted-foreground text-sm">
            {meta.page} из {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}
