'use client';

import {
  createTransactionSchema,
  toDateKey,
  type CreateTransactionDto,
  type Currency,
  type Transaction,
  type TransactionType,
} from '@expense-tracker/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { CategoryIcon } from '@/components/categories/category-icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/use-categories';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/use-transactions';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, INCOME_COLOR_CLASS } from '@/lib/utils';

/**
 * Форма работает со строками, как их отдаёт <input>. Сумма намеренно остаётся
 * строкой на всём пути до API: перевод в number потерял бы копейки.
 */
interface TransactionFormValues {
  amount: string;
  type: TransactionType;
  currency: Currency;
  date: string;
  description: string;
  categoryId: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Операция для редактирования; отсутствует — режим создания. */
  transaction?: Transaction;
  /** Валюта по умолчанию для новой операции. */
  currency: Currency;
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'EXPENSE', label: 'Расход' },
  { value: 'INCOME', label: 'Доход' },
];

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  currency,
}: TransactionDialogProps) {
  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const isEdit = transaction !== undefined;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
    // Третий параметр — реальный тип значений после zodResolver (amount
    // нормализован, date — уже Date из z.coerce.date()), а не сырой
    // TransactionFormValues, который описывает лишь состояние полей формы.
  } = useForm<TransactionFormValues, unknown, CreateTransactionDto>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: emptyValues(currency),
  });

  // currency нужна только в момент открытия (для дефолта новой операции), но не
  // должна вызывать пересброс формы, если подгрузится уже после открытия диалога.
  const currencyRef = useRef(currency);
  currencyRef.current = currency;

  // Диалог не размонтируется между открытиями — значения сбрасываем вручную.
  useEffect(() => {
    if (!open) return;

    reset(
      transaction
        ? {
            amount: transaction.amount,
            type: transaction.type,
            currency: transaction.currency as Currency,
            date: toDateKey(new Date(transaction.date)),
            description: transaction.description ?? '',
            categoryId: transaction.categoryId,
          }
        : emptyValues(currencyRef.current),
    );
  }, [open, transaction, reset]);

  const selectedType = watch('type');
  const isPending = createTransaction.isPending || updateTransaction.isPending;

  const onSubmit = handleSubmit((values) => {
    // values уже приведены resolver'ом к CreateTransactionDto; описание
    // отдельно нормализуем в undefined — zod .trim() пустую строку не убирает.
    const dto: CreateTransactionDto = {
      ...values,
      description: values.description?.trim() || undefined,
    };

    const onSuccess = () => {
      toast.success(isEdit ? 'Операция обновлена' : 'Операция добавлена');
      onOpenChange(false);
    };
    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить операцию'));

    if (transaction) {
      updateTransaction.mutate({ id: transaction.id, ...dto }, { onSuccess, onError });
    } else {
      createTransaction.mutate(dto, { onSuccess, onError });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Изменение операции' : 'Новая операция'}</DialogTitle>
          <DialogDescription>Сумма, категория и дата операции</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Тип</Label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={selectedType === option.value ? 'secondary' : 'outline'}
                  aria-pressed={selectedType === option.value}
                  onClick={() => setValue('type', option.value, { shouldValidate: true })}
                  className={cn(
                    selectedType === option.value && 'border-foreground border',
                    option.value === 'INCOME' && selectedType === option.value && INCOME_COLOR_CLASS,
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transaction-amount">Сумма</Label>
            <Input
              id="transaction-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              aria-invalid={errors.amount !== undefined}
              {...register('amount')}
            />
            {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transaction-category">Категория</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="transaction-category"
                    aria-invalid={errors.categoryId !== undefined}
                  >
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <CategoryIcon
                          name={category.icon}
                          className="size-4"
                          color={category.color}
                        />
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-destructive text-sm">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transaction-date">Дата</Label>
            <Input id="transaction-date" type="date" {...register('date')} />
            {errors.date && <p className="text-destructive text-sm">{errors.date.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transaction-description">Описание</Label>
            <Input
              id="transaction-description"
              autoComplete="off"
              placeholder="Необязательно"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-destructive text-sm">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyValues(currency: Currency): TransactionFormValues {
  return {
    amount: '',
    type: 'EXPENSE',
    currency,
    date: toDateKey(new Date()),
    description: '',
    categoryId: '',
  };
}
