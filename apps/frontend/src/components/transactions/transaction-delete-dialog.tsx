'use client';

import { formatMoney, type Currency, type Transaction } from '@expense-tracker/shared';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteTransaction } from '@/hooks/use-transactions';
import { getApiErrorMessage } from '@/lib/api-error';

interface TransactionDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
}

export function TransactionDeleteDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDeleteDialogProps) {
  const deleteTransaction = useDeleteTransaction();

  const onConfirm = () => {
    if (!transaction) return;

    deleteTransaction.mutate(transaction.id, {
      onSuccess: () => {
        toast.success('Операция удалена');
        onOpenChange(false);
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Не удалось удалить операцию')),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить операцию?</DialogTitle>
          <DialogDescription>
            {transaction
              ? `${transaction.category?.name ?? 'Операция'} на ${formatMoney(
                  transaction.amount,
                  transaction.currency as Currency,
                )} будет удалена безвозвратно.`
              : 'Действие необратимо.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteTransaction.isPending}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={deleteTransaction.isPending}
          >
            {deleteTransaction.isPending ? 'Удаляем…' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
