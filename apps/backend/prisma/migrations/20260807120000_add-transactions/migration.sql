-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- RenameTable: expenses -> transactions (RENAME, а не DROP/CREATE — данные сохраняются)
ALTER TABLE "expenses" RENAME TO "transactions";

-- RenameColumn
ALTER TABLE "transactions" RENAME COLUMN "note" TO "description";

-- AddColumn: DEFAULT заполняет существующие строки — все они были расходами
ALTER TABLE "transactions" ADD COLUMN "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE';

-- RenameConstraint: Prisma сверяет имена при диффе, поэтому переименование обязательно
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_pkey" TO "transactions_pkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_categoryId_fkey" TO "transactions_categoryId_fkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_userId_fkey" TO "transactions_userId_fkey";

-- RenameIndex
ALTER INDEX "expenses_userId_date_idx" RENAME TO "transactions_userId_date_idx";
ALTER INDEX "expenses_userId_categoryId_idx" RENAME TO "transactions_userId_categoryId_idx";

-- CreateIndex: фильтр списка по типу за период
CREATE INDEX "transactions_userId_type_date_idx" ON "transactions"("userId", "type", "date");
