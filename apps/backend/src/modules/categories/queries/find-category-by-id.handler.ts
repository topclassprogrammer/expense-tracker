import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { CategoriesService } from '../categories.service';

import { FindCategoryByIdQuery } from './find-category-by-id.query';

import type { Category } from '@prisma/client';

/** Обрабатывает {@link FindCategoryByIdQuery}, делегируя поиск `CategoriesService`. */
@QueryHandler(FindCategoryByIdQuery)
export class FindCategoryByIdHandler implements IQueryHandler<FindCategoryByIdQuery> {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * @param query - id пользователя и id искомой категории.
   * @returns Найденная категория.
   * @throws {NotFoundException} Категория не найдена, либо не системная и принадлежит другому пользователю.
   */
  execute(query: FindCategoryByIdQuery): Promise<Category> {
    return this.categoriesService.findOne(query.userId, query.categoryId);
  }
}
