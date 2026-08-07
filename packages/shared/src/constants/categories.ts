/** Категория по умолчанию: создаётся сидом и доступна всем пользователям. */
export interface DefaultCategory {
  name: string;
  /** Имя иконки lucide-react. */
  icon: string;
  /** HEX-цвет для графиков и бейджей. */
  color: string;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Продукты', icon: 'shopping-cart', color: '#22c55e' },
  { name: 'Транспорт', icon: 'car', color: '#3b82f6' },
  { name: 'Жильё', icon: 'home', color: '#8b5cf6' },
  { name: 'Кафе и рестораны', icon: 'utensils', color: '#f97316' },
  { name: 'Здоровье', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Развлечения', icon: 'gamepad-2', color: '#ec4899' },
  { name: 'Одежда', icon: 'shirt', color: '#14b8a6' },
  { name: 'Образование', icon: 'graduation-cap', color: '#6366f1' },
  { name: 'Подписки', icon: 'repeat', color: '#a855f7' },
  { name: 'Прочее', icon: 'circle-ellipsis', color: '#64748b' },
] as const;

/** Палитра для выбора цвета пользовательской категории. */
export const CATEGORY_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
] as const;
