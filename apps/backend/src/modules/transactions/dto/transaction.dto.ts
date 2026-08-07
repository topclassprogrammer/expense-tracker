import {
  createTransactionSchema,
  transactionQuerySchema,
  transactionSummaryQuerySchema,
  updateTransactionSchema,
} from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateTransactionDto extends createZodDto(createTransactionSchema) {}

export class UpdateTransactionDto extends createZodDto(updateTransactionSchema) {}

export class TransactionQueryDto extends createZodDto(transactionQuerySchema) {}

export class TransactionSummaryQueryDto extends createZodDto(transactionSummaryQuerySchema) {}
