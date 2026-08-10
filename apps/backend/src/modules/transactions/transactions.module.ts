import { Module } from '@nestjs/common';

import { CountTransactionsByCategoryHandler } from './queries/count-transactions-by-category.handler';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

/**
 * Модуль операций (доходов/расходов): контроллер, сервис и CQRS-хендлер
 * `CountTransactionsByCategoryQuery`, которым модуль категорий проверяет,
 * можно ли удалить категорию.
 */
@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, CountTransactionsByCategoryHandler],
  exports: [TransactionsService],
})
export class TransactionsModule {}
