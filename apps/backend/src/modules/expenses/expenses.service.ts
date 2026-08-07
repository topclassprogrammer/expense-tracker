import {
  fromCents,
  percentageOf,
  toDateKey,
  type ExpenseSummary,
  type Paginated,
} from '@expense-tracker/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Prisma, type Expense } from '@prisma/client';

import { FindCategoryByIdQuery } from '../categories/queries/find-category-by-id.query';

import type {
  CreateExpenseDto,
  ExpenseQueryDto,
  ExpenseSummaryQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

import { PrismaService } from '@/prisma/prisma.service';

type ExpenseWithCategory = Prisma.ExpenseGetPayload<{ include: { category: true } }>;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async findAll(userId: string, query: ExpenseQueryDto): Promise<Paginated<ExpenseWithCategory>> {
    const where = this.buildWhere(userId, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.expense.count({ where }),
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

  async findOne(userId: string, id: string): Promise<ExpenseWithCategory> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!expense) {
      throw new NotFoundException('Расход не найден');
    }

    return expense;
  }

  async create(userId: string, dto: CreateExpenseDto): Promise<ExpenseWithCategory> {
    // Проверяем, что категория принадлежит пользователю или является системной
    await this.queryBus.execute(new FindCategoryByIdQuery(userId, dto.categoryId));

    return this.prisma.expense.create({
      data: { ...dto, userId },
      include: { category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseWithCategory> {
    await this.findOne(userId, id);

    if (dto.categoryId) {
      await this.queryBus.execute(new FindCategoryByIdQuery(userId, dto.categoryId));
    }

    return this.prisma.expense.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.expense.delete({ where: { id } });
  }

  /** Количество расходов, ссылающихся на категорию — используется при её удалении. */
  countByCategory(categoryId: string): Promise<number> {
    return this.prisma.expense.count({ where: { categoryId } });
  }

  /** Агрегация за период: итог, разбивка по категориям и по дням. */
  async summary(userId: string, query: ExpenseSummaryQueryDto): Promise<ExpenseSummary> {
    const where: Prisma.ExpenseWhereInput = {
      userId,
      currency: query.currency,
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom && { gte: query.dateFrom }),
              ...(query.dateTo && { lte: query.dateTo }),
            },
          }
        : {}),
    };

    const expenses = await this.prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const totalCents = expenses.reduce((acc, expense) => acc + toCents(expense.amount), 0);
    const total = fromCents(totalCents);

    const byCategory = new Map<
      string,
      { name: string; color: string; cents: number; count: number }
    >();
    const byDay = new Map<string, number>();

    for (const expense of expenses) {
      const entry = byCategory.get(expense.categoryId) ?? {
        name: expense.category.name,
        color: expense.category.color,
        cents: 0,
        count: 0,
      };
      entry.cents += toCents(expense.amount);
      entry.count += 1;
      byCategory.set(expense.categoryId, entry);

      const dayKey = toDateKey(expense.date);
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + toCents(expense.amount));
    }

    return {
      total,
      currency: query.currency,
      count: expenses.length,
      byCategory: [...byCategory.entries()]
        .map(([categoryId, entry]) => ({
          categoryId,
          categoryName: entry.name,
          color: entry.color,
          total: fromCents(entry.cents),
          count: entry.count,
          percentage: percentageOf(fromCents(entry.cents), total),
        }))
        .sort((a, b) => Number(b.total) - Number(a.total)),
      byDay: [...byDay.entries()]
        .map(([date, cents]) => ({ date, total: fromCents(cents) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  private buildWhere(userId: string, query: ExpenseQueryDto): Prisma.ExpenseWhereInput {
    return {
      userId,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.currency && { currency: query.currency }),
      ...(query.search && { note: { contains: query.search, mode: 'insensitive' } }),
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
export type { ExpenseWithCategory, Expense };
