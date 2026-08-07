import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CountExpensesByCategoryQuery } from '../expenses/queries/count-expenses-by-category.query';

import type { CategoryQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import type { Category } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  /** Категории пользователя + системные (если не отключены запросом). */
  findAll(userId: string, query: CategoryQueryDto): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: query.includeDefaults ? { OR: [{ userId }, { userId: null }] } : { userId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category || (category.userId !== null && category.userId !== userId)) {
      throw new NotFoundException('Категория не найдена');
    }

    return category;
  }

  create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: { ...dto, userId, isDefault: false },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.assertOwned(userId, id);

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwned(userId, id);

    const expensesCount = await this.queryBus.execute(new CountExpensesByCategoryQuery(id));

    if (expensesCount > 0) {
      throw new ConflictException(
        `Категория используется в ${expensesCount} расходах — сначала перенесите их в другую категорию`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
  }

  /** Системные категории редактировать нельзя, чужие — не видно. */
  private async assertOwned(userId: string, id: string): Promise<void> {
    const category = await this.findOne(userId, id);

    if (category.isDefault || category.userId === null) {
      throw new ForbiddenException('Системную категорию нельзя изменить');
    }
  }
}
