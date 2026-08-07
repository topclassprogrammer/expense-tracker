import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет должен быть в формате #RRGGBB');

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: hexColor,
  /** true — системная категория, недоступная для редактирования. */
  isDefault: z.boolean(),
  userId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Введите название').max(40).trim(),
  icon: z.string().min(1).max(40).default('circle-ellipsis'),
  color: hexColor.default('#64748b'),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryQuerySchema = z.object({
  /**
   * Включать ли системные категории в выдачу.
   * Разбирается вручную: z.coerce.boolean() дал бы true для строки 'false' из query-string.
   */
  includeDefaults: z
    .union([z.boolean(), z.enum(['true', 'false']).transform((value) => value === 'true')])
    .default(true),
});

export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;
