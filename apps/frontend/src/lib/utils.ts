import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Склеивает классы Tailwind, разрешая конфликты последним значением. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
