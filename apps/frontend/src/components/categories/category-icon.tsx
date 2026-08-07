'use client';

import {
  Baby,
  Briefcase,
  Car,
  CircleEllipsis,
  Coffee,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  PawPrint,
  Plane,
  Repeat,
  Shirt,
  ShoppingCart,
  Smartphone,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Явная таблица «имя из БД → компонент». Динамический импорт lucide-react
 * по строке не используется: он тянет в бандл весь набор иконок.
 */
const ICONS: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  car: Car,
  home: Home,
  utensils: Utensils,
  'heart-pulse': HeartPulse,
  'gamepad-2': Gamepad2,
  shirt: Shirt,
  'graduation-cap': GraduationCap,
  repeat: Repeat,
  'circle-ellipsis': CircleEllipsis,
  plane: Plane,
  gift: Gift,
  dumbbell: Dumbbell,
  wallet: Wallet,
  smartphone: Smartphone,
  'paw-print': PawPrint,
  baby: Baby,
  briefcase: Briefcase,
  fuel: Fuel,
  coffee: Coffee,
};

/** Имена иконок для выбора в форме категории. */
export const CATEGORY_ICONS = Object.keys(ICONS);

/** Запасная иконка для значений, которых нет в таблице. */
export const FALLBACK_ICON = 'circle-ellipsis';

interface CategoryIconProps {
  name: string;
  className?: string;
  color?: string;
}

export function CategoryIcon({ name, className, color }: CategoryIconProps) {
  const Icon = ICONS[name] ?? CircleEllipsis;

  return <Icon className={className} style={color ? { color } : undefined} aria-hidden />;
}
