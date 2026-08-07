/** Границы месяца по периоду "YYYY-MM" (UTC). */
export function monthRange(period: string): { from: Date; to: Date } {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return {
    from: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

/** Текущий период в формате "YYYY-MM". */
export function currentPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Период "YYYY-MM" из года и месяца — вход для monthRange(). */
export function periodOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Дата в формате "YYYY-MM-DD" — ключ группировки в сводках и значение для <input type="date">. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
