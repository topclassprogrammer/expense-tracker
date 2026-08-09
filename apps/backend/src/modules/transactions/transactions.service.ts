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

/**
 * Бизнес-логика операций (доходы/расходы): CRUD, подсчёт по категории и месячная сводка.
 * Все методы, принимающие `userId`, ограничивают выборку операциями этого пользователя.
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Список операций пользователя с фильтрами и пагинацией.
   *
   * @param userId - id владельца операций.
   * @param query - фильтры (период, тип, категория, валюта, поиск по описанию), сортировка и пагинация.
   * @returns Страница операций с метаданными пагинации.
   */
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

  /**
   * Операция по id в рамках одного пользователя.
   *
   * @param userId - id владельца операции.
   * @param id - id операции.
   * @returns Операция вместе с её категорией.
   * @throws {NotFoundException} Операция с таким id не найдена или принадлежит другому пользователю.
   */
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

  /**
   * Создаёт операцию для пользователя.
   *
   * @param userId - id владельца новой операции.
   * @param dto - данные операции (сумма, тип, категория, валюта, дата, описание).
   * @returns Созданная операция вместе с её категорией.
   * @throws {NotFoundException} Категория из `dto.categoryId` не найдена, не принадлежит
   * пользователю и не является системной (пробрасывается из {@link FindCategoryByIdQuery}).
   */
  async create(userId: string, dto: CreateTransactionDto): Promise<TransactionWithCategory> {
    // Проверяем, что категория принадлежит пользователю или является системной
    await this.queryBus.execute(new FindCategoryByIdQuery(userId, dto.categoryId));

    return this.prisma.transaction.create({
      data: { ...dto, userId },
      include: { category: true },
    });
  }

  /**
   * Обновляет операцию пользователя.
   *
   * @param userId - id владельца операции.
   * @param id - id обновляемой операции.
   * @param dto - изменяемые поля операции.
   * @returns Обновлённая операция вместе с её категорией.
   * @throws {NotFoundException} Операция не найдена ({@link findOne}), либо новая категория
   * из `dto.categoryId` не найдена/недоступна пользователю (пробрасывается из {@link FindCategoryByIdQuery}).
   */
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

  /**
   * Удаляет операцию пользователя.
   *
   * @param userId - id владельца операции.
   * @param id - id удаляемой операции.
   * @returns Ничего не возвращает.
   * @throws {NotFoundException} Операция не найдена ({@link findOne}).
   */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Количество операций, ссылающихся на категорию — используется при её удалении
   * (см. {@link CountTransactionsByCategoryHandler}), чтобы запретить удаление
   * категории, пока на неё есть ссылки.
   *
   * @param categoryId - id проверяемой категории.
   * @returns Число операций с этой категорией (0, если операций нет).
   */
  countByCategory(categoryId: string): Promise<number> {
    return this.prisma.transaction.count({ where: { categoryId } });
  }

  /**
   * Агрегация операций за месяц: доходы, расходы, баланс, разбивка по категориям и по дням.
   *
   * @param userId - id владельца операций.
   * @param query - год, месяц и валюта, за которые считается сводка.
   * @returns Сводка за месяц: суммы, количество операций, разбивка `byCategory` и `byDay`.
   */
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

  /**
   * Собирает условие `WHERE` для списка операций из фильтров запроса.
   *
   * @param userId - id владельца операций — всегда входит в условие.
   * @param query - необязательные фильтры: тип, категория, валюта, поиск по описанию, диапазон дат.
   * @returns Условие Prisma `where` для `transaction.findMany`/`transaction.count`.
   */
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

/**
 * Переводит `Prisma.Decimal` в целые копейки, без потери точности.
 *
 * @param amount - сумма операции как `Prisma.Decimal`.
 * @returns Сумма в копейках (целое число).
 */
function toCents(amount: Prisma.Decimal): number {
  return amount.mul(100).toNumber();
}

/** Реэкспорт типа для контроллера. */
export type { TransactionWithCategory, Transaction };
