import { Module } from '@nestjs/common';

import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { CountExpensesByCategoryHandler } from './queries/count-expenses-by-category.handler';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, CountExpensesByCategoryHandler],
  exports: [ExpensesService],
})
export class ExpensesModule {}
