import {
  fromCents,
  monthRange,
  percentageOf,
  periodOf,
  toDateKey,
  type Paginated,
  type TransactionSummary,
} from '@expense-tracker/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Prisma, type Transaction } from '@prisma/client';

import { FindCategoryByIdQuery } from '../categories/queries/find-category-by-id.query';

import type {
  CreateTransactionDto,
  TransactionQueryDto,
  TransactionSummaryQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';

import { PrismaService } from '@/prisma/prisma.service';

type TransactionWithCategory = Prisma.TransactionGetPayload<{ include: { category: true } }>;

/** Накопитель сводки по одной категории в рамках одного типа операции. */
interface CategoryBucket {
  name: string;
  color: string;
  cents: number;
  count: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async findAll(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<Paginated<TransactionWithCategory>> {
    const where = this.buildWhere(userId, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async findOne(userId: string, id: string): Promise<TransactionWithCategory> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!transaction) {
      throw new NotFoundException('Операция не найдена');
    }

    return transaction;
  }

  async create(userId: string, dto: CreateTransactionDto): Promise<TransactionWithCategory> {
    // Проверяем, что категория принадлежит пользователю или является системной
    await this.queryBus.execute(new FindCategoryByIdQuery(userId, dto.categoryId));

    return this.prisma.transaction.create({
      data: { ...dto, userId },
      include: { category: true },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionWithCategory> {
    await this.findOne(userId, id);

    if (dto.categoryId) {
      await this.queryBus.execute(new FindCategoryByIdQuery(userId, dto.categoryId));
    }

    return this.prisma.transaction.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  /** Количество операций, ссылающихся на категорию — используется при её удалении. */
  countByCategory(categoryId: string): Promise<number> {
    return this.prisma.transaction.count({ where: { categoryId } });
  }

  /** Агрегация за месяц: доходы, расходы, баланс, разбивка по категориям и по дням. */
  async summary(userId: string, query: TransactionSummaryQueryDto): Promise<TransactionSummary> {
    const { from, to } = monthRange(periodOf(query.year, query.month));

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, currency: query.currency, date: { gte: from, lte: to } },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    let incomeCents = 0;
    let expenseCents = 0;

    // Ключ — "тип:категория": одна категория может использоваться в обе стороны
    const byCategory = new Map<string, CategoryBucket>();
    const byDay = new Map<string, { income: number; expense: number }>();

    for (const transaction of transactions) {
      const cents = toCents(transaction.amount);
      const isIncome = transaction.type === 'INCOME';

      if (isIncome) {
        incomeCents += cents;
      } else {
        expenseCents += cents;
      }

      const categoryKey = `${transaction.type}:${transaction.categoryId}`;
      const bucket = byCategory.get(categoryKey) ?? {
        name: transaction.category.name,
        color: transaction.category.color,
        cents: 0,
        count: 0,
      };
      bucket.cents += cents;
      bucket.count += 1;
      byCategory.set(categoryKey, bucket);

      const dayKey = toDateKey(transaction.date);
      const day = byDay.get(dayKey) ?? { income: 0, expense: 0 };
      day[isIncome ? 'income' : 'expense'] += cents;
      byDay.set(dayKey, day);
    }

    const income = fromCents(incomeCents);
    const expense = fromCents(expenseCents);

    return {
      month: query.month,
      year: query.year,
      currency: query.currency,
      income,
      expense,
      net: fromCents(incomeCents - expenseCents),
      count: transactions.length,
      byCategory: [...byCategory.entries()]
        .map(([key, bucket]) => {
          const [type, categoryId] = key.split(':') as ['INCOME' | 'EXPENSE', string];
          const total = fromCents(bucket.cents);

          return {
            categoryId,
            categoryName: bucket.name,
            color: bucket.color,
            type,
            total,
            count: bucket.count,
            // Доля считается внутри своего типа — смешение доходов и расходов
            // в одной базе дало бы бессмысленные проценты
            percentage: percentageOf(total, type === 'INCOME' ? income : expense),
          };
        })
        .sort((a, b) => a.type.localeCompare(b.type) || Number(b.total) - Number(a.total)),
      byDay: [...byDay.entries()]
        .map(([date, day]) => ({
          date,
          income: fromCents(day.income),
          expense: fromCents(day.expense),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  private buildWhere(userId: string, query: TransactionQueryDto): Prisma.TransactionWhereInput {
    return {
      userId,
      ...(query.type && { type: query.type }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.currency && { currency: query.currency }),
      ...(query.search && { description: { contains: query.search, mode: 'insensitive' } }),
      ...((query.dateFrom || query.dateTo) && {
        date: {
          ...(query.dateFrom && { gte: query.dateFrom }),
          ...(query.dateTo && { lte: query.dateTo }),
        },
      }),
    };
  }
}

/** Prisma.Decimal -> целые копейки, без потери точности. */
function toCents(amount: Prisma.Decimal): number {
  return amount.mul(100).toNumber();
}

/** Реэкспорт типа для контроллера. */
export type { TransactionWithCategory, Transaction };
