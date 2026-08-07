import {
  createExpenseSchema,
  expenseQuerySchema,
  expenseSummaryQuerySchema,
  updateExpenseSchema,
} from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateExpenseDto extends createZodDto(createExpenseSchema) {}

export class UpdateExpenseDto extends createZodDto(updateExpenseSchema) {}

export class ExpenseQueryDto extends createZodDto(expenseQuerySchema) {}

export class ExpenseSummaryQueryDto extends createZodDto(expenseSummaryQuerySchema) {}
