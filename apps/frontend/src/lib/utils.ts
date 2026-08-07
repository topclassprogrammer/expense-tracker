import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Склеивает классы Tailwind, разрешая конфликты последним значением. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Цвет для сумм и элементов, обозначающих доход (INCOME), в обеих темах. */
export const INCOME_COLOR_CLASS = 'text-emerald-600 dark:text-emerald-400';
