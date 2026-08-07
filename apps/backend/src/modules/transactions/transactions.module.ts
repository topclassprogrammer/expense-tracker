import { Module } from '@nestjs/common';

import { CountTransactionsByCategoryHandler } from './queries/count-transactions-by-category.handler';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, CountTransactionsByCategoryHandler],
  exports: [TransactionsService],
})
export class TransactionsModule {}
