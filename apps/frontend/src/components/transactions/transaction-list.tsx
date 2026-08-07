'use client';

import { formatMoney, type Currency, type Transaction } from '@expense-tracker/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';

import { CategoryIcon } from '@/components/categories/category-icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, INCOME_COLOR_CLASS } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onCreate: () => void;
}

export function TransactionList({
  transactions,
  isLoading,
  onEdit,
  onDelete,
  onCreate,
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 py-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-muted-foreground text-sm">
          Операций за выбранный период нет — добавьте первую.
        </p>
        <Button size="sm" onClick={onCreate}>
          Добавить операцию
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {transactions.map((transaction) => {
        const color = transaction.category?.color ?? '#64748b';
        const isIncome = transaction.type === 'INCOME';

        return (
          <li
            key={transaction.id}
            className="group flex items-center gap-3 border-b py-3 last:border-b-0"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}1a` }}
            >
              <CategoryIcon
                name={transaction.category?.icon ?? 'circle-ellipsis'}
                className="size-4"
                color={color}
              />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{transaction.category?.name ?? '—'}</p>
              {transaction.description && (
                <p className="text-muted-foreground truncate text-xs">{transaction.description}</p>
              )}
            </div>

            <span className="text-muted-foreground hidden text-sm sm:inline">
              {format(new Date(transaction.date), 'd MMM yyyy', { locale: ru })}
            </span>

            <span
              className={cn(
                'w-32 text-right text-sm font-medium tabular-nums',
                isIncome && INCOME_COLOR_CLASS,
              )}
            >
              {isIncome ? '+' : '−'}
              {formatMoney(transaction.amount, transaction.currency as Currency)}
            </span>

            {/* На тач-устройствах hover не срабатывает, поэтому кнопки скрываются только на sm+ */}
            <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Изменить операцию"
                onClick={() => onEdit(transaction)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Удалить операцию"
                onClick={() => onDelete(transaction)}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
