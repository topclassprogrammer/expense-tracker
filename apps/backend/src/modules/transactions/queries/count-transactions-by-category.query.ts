/**
 * CQRS-запрос: сколько операций ссылается на категорию.
 * Используется {@link CategoriesService.remove} перед удалением категории.
 */
export class CountTransactionsByCategoryQuery {
  /** @param categoryId - id проверяемой категории. */
  constructor(public readonly categoryId: string) {}
}
