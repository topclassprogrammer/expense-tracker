/**
 * CQRS-запрос: найти категорию по id, доступную указанному пользователю
 * (своя категория или системная). Используется модулем операций при
 * создании/изменении операции, чтобы проверить принадлежность категории.
 */
export class FindCategoryByIdQuery {
  /**
   * @param userId - id пользователя, для которого проверяется доступность категории.
   * @param categoryId - id искомой категории.
   */
  constructor(
    public readonly userId: string,
    public readonly categoryId: string,
  ) {}
}
