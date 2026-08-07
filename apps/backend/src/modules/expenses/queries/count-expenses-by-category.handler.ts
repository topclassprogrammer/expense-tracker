import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ExpensesService } from '../expenses.service';

import { CountExpensesByCategoryQuery } from './count-expenses-by-category.query';

@QueryHandler(CountExpensesByCategoryQuery)
export class CountExpensesByCategoryHandler implements IQueryHandler<CountExpensesByCategoryQuery> {
  constructor(private readonly expensesService: ExpensesService) {}

  execute(query: CountExpensesByCategoryQuery): Promise<number> {
    return this.expensesService.countByCategory(query.categoryId);
  }
}
