'use client';

import {
  currentPeriod,
  formatMoney,
  monthRange,
  type Currency,
  type Transaction,
  type TransactionType,
} from '@expense-tracker/shared';
import { useMemo, useState } from 'react';

import { CategoryDialog } from '@/components/categories/category-dialog';
import { TransactionDeleteDialog } from '@/components/transactions/transaction-delete-dialog';
import { TransactionDialog } from '@/components/transactions/transaction-dialog';
import { TransactionFilters } from '@/components/transactions/transaction-filters';
import { TransactionList } from '@/components/transactions/transaction-list';
import { TransactionPagination } from '@/components/transactions/transaction-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-auth';
import { useTransactionSummary, useTransactions } from '@/hooks/use-transactions';
import { cn, INCOME_COLOR_CLASS } from '@/lib/utils';

/** Сколько операций показываем на одной странице списка. */
const PAGE_SIZE = 10;

export default function DashboardPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [type, setType] = useState<TransactionType | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const [isTransactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [deleting, setDeleting] = useState<Transaction | undefined>();

  const { data: user } = useCurrentUser();
  const currency = (user?.defaultCurrency ?? 'RUB') as Currency;

  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  const range = useMemo(() => monthRange(period), [period]);

  const { data: summary, isLoading: isSummaryLoading } = useTransactionSummary({
    month,
    year,
    currency,
  });

  const { data: transactions, isLoading: isListLoading } = useTransactions({
    page,
    limit: PAGE_SIZE,
    type,
    categoryId,
    dateFrom: range.from,
    dateTo: range.to,
  });

  const expenseByCategory = summary?.byCategory.filter((item) => item.type === 'EXPENSE') ?? [];
  const meta = transactions?.meta;
  const isNegative = Number(summary?.net ?? 0) < 0;

  /** Любая смена фильтра возвращает список на первую страницу. */
  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const openCreate = () => {
    setEditing(undefined);
    setTransactionDialogOpen(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setTransactionDialogOpen(true);
  };

  const openDelete = (transaction: Transaction) => {
    setDeleting(transaction);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Дашборд</h1>
          <p className="text-muted-foreground text-sm">Сводка и операции за выбранный месяц</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
            Категория
          </Button>
          <Button onClick={openCreate}>Добавить операцию</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Доходы"
          value={formatMoney(summary?.income ?? '0', currency)}
          isLoading={isSummaryLoading}
          className={INCOME_COLOR_CLASS}
        />
        <SummaryCard
          label="Расходы"
          value={formatMoney(summary?.expense ?? '0', currency)}
          isLoading={isSummaryLoading}
        />
        <SummaryCard
          label="Баланс"
          value={formatMoney(summary?.net ?? '0', currency)}
          isLoading={isSummaryLoading}
          className={isNegative ? 'text-destructive' : undefined}
        />
        <SummaryCard
          label="Операций"
          value={String(summary?.count ?? 0)}
          isLoading={isSummaryLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Период, тип операции и категория</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionFilters
            period={period}
            onPeriodChange={withPageReset(setPeriod)}
            type={type}
            onTypeChange={withPageReset(setType)}
            categoryId={categoryId}
            onCategoryChange={withPageReset(setCategoryId)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Операции</CardTitle>
          <CardDescription>История за выбранный период</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TransactionList
            transactions={transactions?.items ?? []}
            isLoading={isListLoading}
            onEdit={openEdit}
            onDelete={openDelete}
            onCreate={openCreate}
          />

          {meta && meta.total > 0 && <TransactionPagination meta={meta} onPageChange={setPage} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>По категориям</CardTitle>
          <CardDescription>Распределение расходов за выбранный месяц</CardDescription>
        </CardHeader>
        <CardContent>
          {isSummaryLoading && <Skeleton className="h-24 w-full" />}

          {!isSummaryLoading && !expenseByCategory.length && (
            <p className="text-muted-foreground text-sm">Расходов за этот месяц пока нет.</p>
          )}

          <ul className="flex flex-col gap-4">
            {expenseByCategory.map((item) => (
              <li key={item.categoryId} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-sm">{item.categoryName}</span>
                  <span className="text-muted-foreground text-sm">{item.percentage}%</span>
                  <span className="w-32 text-right text-sm font-medium tabular-nums">
                    {formatMoney(item.total, currency)}
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <TransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        transaction={editing}
        currency={currency}
      />
      <TransactionDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        transaction={deleting}
      />
      <CategoryDialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen} />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  isLoading: boolean;
  className?: string;
}

function SummaryCard({ label, value, isLoading, className }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn('text-2xl', className)}>
          {isLoading ? <Skeleton className="h-7 w-28" /> : value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
