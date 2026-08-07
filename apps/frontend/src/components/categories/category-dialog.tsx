'use client';

import { CATEGORY_COLORS, createCategorySchema, type Category } from '@expense-tracker/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { CATEGORY_ICONS, CategoryIcon, FALLBACK_ICON } from './category-icon';

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
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

/** Значения формы совпадают с контрактом создания категории на бэкенде. */
type CategoryFormValues = {
  name: string;
  icon: string;
  color: string;
};

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Категория для редактирования; отсутствует — режим создания. */
  category?: Category;
}

const EMPTY_VALUES: CategoryFormValues = {
  name: '',
  icon: FALLBACK_ICON,
  color: CATEGORY_COLORS[0],
};

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEdit = category !== undefined;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: EMPTY_VALUES,
  });

  // Диалог не размонтируется между открытиями — значения сбрасываем вручную.
  useEffect(() => {
    if (open) {
      reset(
        category
          ? { name: category.name, icon: category.icon, color: category.color }
          : EMPTY_VALUES,
      );
    }
  }, [open, category, reset]);

  const selectedIcon = watch('icon');
  const selectedColor = watch('color');
  const isPending = createCategory.isPending || updateCategory.isPending;

  const onSubmit = handleSubmit((values) => {
    const onSuccess = () => {
      toast.success(isEdit ? 'Категория обновлена' : 'Категория создана');
      onOpenChange(false);
    };
    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить категорию'));

    if (category) {
      updateCategory.mutate({ id: category.id, ...values }, { onSuccess, onError });
    } else {
      createCategory.mutate(values, { onSuccess, onError });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Изменение категории' : 'Новая категория'}</DialogTitle>
          <DialogDescription>Название, цвет и иконка для списков и графиков</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">Название</Label>
            <Input id="category-name" autoComplete="off" {...register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Цвет</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Цвет ${color}`}
                  aria-pressed={selectedColor === color}
                  onClick={() => setValue('color', color, { shouldValidate: true })}
                  className={cn(
                    'size-7 rounded-full border-2 transition-transform',
                    selectedColor === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {errors.color && <p className="text-destructive text-sm">{errors.color.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Иконка</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  aria-label={`Иконка ${icon}`}
                  aria-pressed={selectedIcon === icon}
                  onClick={() => setValue('icon', icon, { shouldValidate: true })}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md border transition-colors',
                    selectedIcon === icon ? 'border-foreground bg-accent' : 'hover:bg-accent',
                  )}
                >
                  <CategoryIcon name={icon} className="size-4" color={selectedColor} />
                </button>
              ))}
            </div>
            {errors.icon && <p className="text-destructive text-sm">{errors.icon.message}</p>}
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
