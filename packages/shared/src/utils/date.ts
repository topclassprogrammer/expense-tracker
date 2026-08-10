/**
 * Вычисляет границы месяца (UTC) по периоду в формате "YYYY-MM".
 *
 * @param period - период в формате "YYYY-MM" (например, "2026-08").
 * @returns Начало (`from`, 00:00:00.000 UTC первого дня) и конец (`to`, 23:59:59.999 UTC последнего дня) месяца.
 */
export function monthRange(period: string): { from: Date; to: Date } {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return {
    from: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

/**
 * Текущий период в формате "YYYY-MM".
 *
 * @param date - дата, для которой берётся период; по умолчанию текущий момент.
 * @returns Период в формате "YYYY-MM" по локальным году/месяцу переданной даты.
 */
export function currentPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Собирает период "YYYY-MM" из года и месяца — вход для {@link monthRange}.
 *
 * @param year - год (например, 2026).
 * @param month - месяц, 1-12.
 * @returns Период в формате "YYYY-MM".
 */
export function periodOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Дата в формате "YYYY-MM-DD" — ключ группировки в сводках и значение для `<input type="date">`.
 *
 * @param date - исходная дата.
 * @returns Дата в формате "YYYY-MM-DD" (UTC, по `toISOString`).
 */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
