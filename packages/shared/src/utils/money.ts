import { CURRENCY_LOCALES, DEFAULT_CURRENCY, type Currency } from '../constants/currencies';

/** Форматирует денежную строку/число в локализованный вид: "1 234,50 ₽". */
export function formatMoney(
  amount: string | number,
  currency: Currency = DEFAULT_CURRENCY,
  locale = CURRENCY_LOCALES[currency],
): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Складывает денежные строки без потери точности (целые копейки). */
export function sumAmounts(amounts: readonly string[]): string {
  const totalCents = amounts.reduce((acc, amount) => acc + toCents(amount), 0);
  return fromCents(totalCents);
}

/** "12.34" -> 1234 */
export function toCents(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

/** 1234 -> "12.34" */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Доля суммы от общего значения в процентах, округлённая до одного знака. */
export function percentageOf(amount: string | number, total: string | number): number {
  const totalCents = toCents(total);
  if (totalCents === 0) return 0;
  return Math.round((toCents(amount) / totalCents) * 1000) / 10;
}
