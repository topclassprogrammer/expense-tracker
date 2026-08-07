import {
  categoryQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}

export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}

export class CategoryQueryDto extends createZodDto(categoryQuerySchema) {}
