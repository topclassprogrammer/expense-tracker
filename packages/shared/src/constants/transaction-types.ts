/** Тип операции: поступление или трата. */
export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const DEFAULT_TRANSACTION_TYPE: TransactionType = 'EXPENSE';
