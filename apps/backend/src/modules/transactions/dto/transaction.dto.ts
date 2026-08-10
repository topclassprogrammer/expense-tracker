import {
  createTransactionSchema,
  transactionQuerySchema,
  transactionSummaryQuerySchema,
  updateTransactionSchema,
} from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

/** Тело запроса на создание операции (`POST /transactions`), валидируется `createTransactionSchema`. */
export class CreateTransactionDto extends createZodDto(createTransactionSchema) {}

/** Тело запроса на изменение операции (`PATCH /transactions/:id`), валидируется `updateTransactionSchema`. */
export class UpdateTransactionDto extends createZodDto(updateTransactionSchema) {}

/** Query-параметры списка операций (`GET /transactions`): фильтры, сортировка, пагинация. */
export class TransactionQueryDto extends createZodDto(transactionQuerySchema) {}

/** Query-параметры сводки за месяц (`GET /transactions/summary`): год, месяц, валюта. */
export class TransactionSummaryQueryDto extends createZodDto(transactionSummaryQuerySchema) {}
