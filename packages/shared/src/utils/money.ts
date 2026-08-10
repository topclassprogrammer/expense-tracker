import { CURRENCY_LOCALES, DEFAULT_CURRENCY, type Currency } from '../constants/currencies';

/**
 * Форматирует денежную строку/число в локализованный вид: "1 234,50 ₽".
 *
 * @param amount - сумма как строка (например, "12.34") или число.
 * @param currency - код валюты, по умолчанию {@link DEFAULT_CURRENCY}.
 * @param locale - локаль форматирования, по умолчанию берётся из {@link CURRENCY_LOCALES} для `currency`.
 * @returns Строка суммы, отформатированная `Intl.NumberFormat` для указанной валюты/локали;
 * нечисловой `amount` форматируется как 0.
 */
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

/**
 * Складывает денежные строки без потери точности (через целые копейки).
 *
 * @param amounts - суммы в виде строк (например, ["12.34", "0.66"]).
 * @returns Сумма всех значений как строка с двумя знаками после запятой (например, "13.00").
 */
export function sumAmounts(amounts: readonly string[]): string {
  const totalCents = amounts.reduce((acc, amount) => acc + toCents(amount), 0);
  return fromCents(totalCents);
}

/**
 * Переводит денежное значение в целые копейки: "12.34" -> 1234.
 *
 * @param amount - сумма как строка или число.
 * @returns Сумма в копейках, округлённая до целого.
 */
export function toCents(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

/**
 * Переводит копейки обратно в денежную строку: 1234 -> "12.34".
 *
 * @param cents - сумма в копейках (целое число).
 * @returns Строка суммы с двумя знаками после запятой.
 */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Доля суммы от общего значения в процентах, округлённая до одного знака.
 *
 * @param amount - часть от общей суммы.
 * @param total - общая сумма, от которой считается доля.
 * @returns Процент `amount` от `total` (0, если `total` равен нулю — деление на ноль не выбрасывается).
 */
export function percentageOf(amount: string | number, total: string | number): number {
  const totalCents = toCents(total);
  if (totalCents === 0) return 0;
  return Math.round((toCents(amount) / totalCents) * 1000) / 10;
}
