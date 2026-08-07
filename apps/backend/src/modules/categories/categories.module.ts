import { Module } from '@nestjs/common';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { FindCategoryByIdHandler } from './queries/find-category-by-id.handler';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, FindCategoryByIdHandler],
  exports: [CategoriesService],
})
export class CategoriesModule {}
