'use client';

import { periodOf, type TransactionType } from '@expense-tracker/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useMemo } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/use-categories';

/**
 * Radix Select запрещает пустую строку в value, поэтому «без фильтра»
 * кодируется отдельным значением, а наружу отдаётся undefined.
 */
const ANY = 'ALL';

const MONTHS_SHOWN = 12;

interface TransactionFiltersProps {
  period: string;
  onPeriodChange: (period: string) => void;
  type?: TransactionType;
  onTypeChange: (type?: TransactionType) => void;
  categoryId?: string;
  onCategoryChange: (categoryId?: string) => void;
}

export function TransactionFilters({
  period,
  onPeriodChange,
  type,
  onTypeChange,
  categoryId,
  onCategoryChange,
}: TransactionFiltersProps) {
  const { data: categories } = useCategories();

  // Последние 12 месяцев, считая текущий
  const periods = useMemo(() => {
    const today = new Date();

    return Array.from({ length: MONTHS_SHOWN }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - index, 1);

      return {
        value: periodOf(date.getFullYear(), date.getMonth() + 1),
        label: format(date, 'LLLL yyyy', { locale: ru }),
      };
    });
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger aria-label="Месяц">
          <SelectValue placeholder="Месяц" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((item) => (
            <SelectItem key={item.value} value={item.value} className="capitalize">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={type ?? ANY}
        onValueChange={(value) =>
          onTypeChange(value === ANY ? undefined : (value as TransactionType))
        }
      >
        <SelectTrigger aria-label="Тип операции">
          <SelectValue placeholder="Тип" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Все типы</SelectItem>
          <SelectItem value="INCOME">Доходы</SelectItem>
          <SelectItem value="EXPENSE">Расходы</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={categoryId ?? ANY}
        onValueChange={(value) => onCategoryChange(value === ANY ? undefined : value)}
      >
        <SelectTrigger aria-label="Категория">
          <SelectValue placeholder="Категория" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Все категории</SelectItem>
          {categories?.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
