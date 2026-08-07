'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { Category } from '@expense-tracker/shared';

import { CategoryDialog } from '@/components/categories/category-dialog';
import { CategoryIcon } from '@/components/categories/category-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories, useDeleteCategory } from '@/hooks/use-categories';
import { getApiErrorMessage } from '@/lib/api-error';

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);

  const openCreate = () => {
    setEditing(undefined);
    setIsDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setIsDialogOpen(true);
  };

  const remove = (category: Category) => {
    deleteCategory.mutate(category.id, {
      onSuccess: () => toast.success(`Категория «${category.name}» удалена`),
      // 409 приходит, когда на категорию ссылаются расходы — показываем текст с бэкенда
      onError: (error) => toast.error(getApiErrorMessage(error, 'Не удалось удалить категорию')),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Категории</h1>
          <p className="text-muted-foreground text-sm">Системные и пользовательские категории</p>
        </div>
        <Button onClick={openCreate}>Добавить категорию</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список</CardTitle>
          <CardDescription>Системные категории доступны только для чтения</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-muted-foreground text-sm">Загрузка…</p>}

          {categories?.map((category) => (
            <div key={category.id} className="flex items-center gap-3 rounded-md border p-3">
              <CategoryIcon
                name={category.icon}
                className="size-4 shrink-0"
                color={category.color}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>

              {category.isDefault ? (
                <span className="text-muted-foreground text-xs">системная</span>
              ) : (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Изменить категорию ${category.name}`}
                    onClick={() => openEdit(category)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Удалить категорию ${category.name}`}
                    disabled={deleteCategory.isPending}
                    onClick={() => remove(category)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <CategoryDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} category={editing} />
    </div>
  );
}
