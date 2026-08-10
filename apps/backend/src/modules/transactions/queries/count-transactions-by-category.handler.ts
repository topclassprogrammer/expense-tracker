import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { TransactionsService } from '../transactions.service';

import { CountTransactionsByCategoryQuery } from './count-transactions-by-category.query';

/** Обрабатывает {@link CountTransactionsByCategoryQuery}, делегируя подсчёт `TransactionsService`. */
@QueryHandler(CountTransactionsByCategoryQuery)
export class CountTransactionsByCategoryHandler
  implements IQueryHandler<CountTransactionsByCategoryQuery>
{
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * @param query - запрос с id проверяемой категории.
   * @returns Число операций, ссылающихся на категорию.
   */
  execute(query: CountTransactionsByCategoryQuery): Promise<number> {
    return this.transactionsService.countByCategory(query.categoryId);
  }
}
