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
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CreateTransactionDto,
  TransactionQueryDto,
  TransactionSummaryQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { TransactionsService, type TransactionWithCategory } from './transactions.service';

import type { Paginated, TransactionSummary } from '@expense-tracker/shared';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /** Список операций с фильтрами по периоду, типу, категории и описанию. */
  @Get()
  @ApiOperation({ summary: 'Список операций' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionQueryDto,
  ): Promise<Paginated<TransactionWithCategory>> {
    return this.transactionsService.findAll(userId, query);
  }

  /**
   * Сводка за месяц: доходы, расходы, баланс, разбивка по категориям и дням.
   * Объявлена до `:id`, иначе путь `summary` уйдёт в параметр маршрута.
   */
  @Get('summary')
  @ApiOperation({ summary: 'Сводка операций за месяц' })
  summary(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionSummaryQueryDto,
  ): Promise<TransactionSummary> {
    return this.transactionsService.summary(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Операция по id' })
  @ApiNotFoundResponse({ description: 'Операция не найдена' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<TransactionWithCategory> {
    return this.transactionsService.findOne(userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание операции' })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionWithCategory> {
    return this.transactionsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменение операции' })
  @ApiNotFoundResponse({ description: 'Операция не найдена' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionWithCategory> {
    return this.transactionsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление операции' })
  @ApiNotFoundResponse({ description: 'Операция не найдена' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<void> {
    return this.transactionsService.remove(userId, id);
  }
}
