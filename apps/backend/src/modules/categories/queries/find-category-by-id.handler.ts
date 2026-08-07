import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { CategoriesService } from '../categories.service';

import { FindCategoryByIdQuery } from './find-category-by-id.query';

import type { Category } from '@prisma/client';

@QueryHandler(FindCategoryByIdQuery)
export class FindCategoryByIdHandler implements IQueryHandler<FindCategoryByIdQuery> {
  constructor(private readonly categoriesService: CategoriesService) {}

  execute(query: FindCategoryByIdQuery): Promise<Category> {
    return this.categoriesService.findOne(query.userId, query.categoryId);
  }
}
