import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CreateExpenseDto,
  ExpenseQueryDto,
  ExpenseSummaryQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { ExpensesService, type ExpenseWithCategory } from './expenses.service';

import type { ExpenseSummary, Paginated } from '@expense-tracker/shared';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /** Список расходов с фильтрами по периоду, категории и заметке. */
  @Get()
  @ApiOperation({ summary: 'Список расходов' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ExpenseQueryDto,
  ): Promise<Paginated<ExpenseWithCategory>> {
    return this.expensesService.findAll(userId, query);
  }

  /** Сводка за период: итог, разбивка по категориям и по дням. */
  @Get('summary')
  @ApiOperation({ summary: 'Сводка расходов' })
  summary(
    @CurrentUser('id') userId: string,
    @Query() query: ExpenseSummaryQueryDto,
  ): Promise<ExpenseSummary> {
    return this.expensesService.summary(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Расход по id' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<ExpenseWithCategory> {
    return this.expensesService.findOne(userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание расхода' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseWithCategory> {
    return this.expensesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменение расхода' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseWithCategory> {
    return this.expensesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление расхода' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<void> {
    return this.expensesService.remove(userId, id);
  }
}
