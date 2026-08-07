'use client';

import type { Paginated } from '@expense-tracker/shared';

import { Button } from '@/components/ui/button';

interface TransactionPaginationProps {
  meta: Paginated<unknown>['meta'];
  onPageChange: (page: number) => void;
}

export function TransactionPagination({ meta, onPageChange }: TransactionPaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-sm">Всего операций: {meta.total}</span>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Назад
        </Button>
        <span className="text-muted-foreground text-sm">
          {meta.page} из {meta.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}
