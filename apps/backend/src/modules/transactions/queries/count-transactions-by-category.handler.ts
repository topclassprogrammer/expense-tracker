import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { TransactionsService } from '../transactions.service';

import { CountTransactionsByCategoryQuery } from './count-transactions-by-category.query';

@QueryHandler(CountTransactionsByCategoryQuery)
export class CountTransactionsByCategoryHandler
  implements IQueryHandler<CountTransactionsByCategoryQuery>
{
  constructor(private readonly transactionsService: TransactionsService) {}

  execute(query: CountTransactionsByCategoryQuery): Promise<number> {
    return this.transactionsService.countByCategory(query.categoryId);
  }
}
