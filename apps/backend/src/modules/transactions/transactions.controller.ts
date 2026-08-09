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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  CreateTransactionDto,
  TransactionQueryDto,
  TransactionSummaryQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { TransactionsService, type TransactionWithCategory } from './transactions.service';

import type { Paginated, TransactionSummary } from '@expense-tracker/shared';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

/** REST-контроллер операций (доходов/расходов) текущего пользователя. */
@ApiTags('transactions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Отсутствует или недействителен access-токен' })
@ApiTooManyRequestsResponse({ description: 'Превышен лимит запросов (120 запросов в минуту)' })
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Список операций с фильтрами по периоду, типу, категории и описанию.
   *
   * @param userId - id текущего пользователя (из access-токена).
   * @param query - фильтры, сортировка и пагинация.
   * @returns Страница операций текущего пользователя.
   */
  @Get()
  @ApiOperation({
    summary: 'Список операций',
    description:
      'Возвращает постраничный список операций текущего пользователя с фильтрами по периоду, типу, категории, валюте и описанию.',
  })
  @ApiOkResponse({ description: 'Страница операций с метаданными пагинации' })
  @ApiBadRequestResponse({ description: 'Некорректные параметры фильтрации, сортировки или пагинации' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionQueryDto,
  ): Promise<Paginated<TransactionWithCategory>> {
    return this.transactionsService.findAll(userId, query);
  }

  /**
   * Сводка за месяц: доходы, расходы, баланс, разбивка по категориям и дням.
   * Объявлена до `:id`, иначе путь `summary` уйдёт в параметр маршрута.
   *
   * @param userId - id текущего пользователя.
   * @param query - год, месяц и валюта, за которые считается сводка.
   * @returns Сводка операций текущего пользователя за месяц.
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Сводка операций за месяц',
    description: 'Доходы, расходы, баланс и разбивка по категориям/дням за указанные год, месяц и валюту.',
  })
  @ApiOkResponse({ description: 'Сводка операций пользователя за месяц' })
  @ApiBadRequestResponse({ description: 'Некорректные год, месяц или валюта' })
  summary(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionSummaryQueryDto,
  ): Promise<TransactionSummary> {
    return this.transactionsService.summary(userId, query);
  }

  /**
   * Операция текущего пользователя по id.
   *
   * @param userId - id текущего пользователя.
   * @param id - id операции.
   * @returns Операция вместе с её категорией.
   * @throws {NotFoundException} Операция не найдена или принадлежит другому пользователю (HTTP 404).
   */
  @Get(':id')
  @ApiOperation({ summary: 'Операция по id' })
  @ApiParam({ name: 'id', description: 'id операции' })
  @ApiOkResponse({ description: 'Операция вместе с её категорией' })
  @ApiNotFoundResponse({ description: 'Операция не найдена' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<TransactionWithCategory> {
    return this.transactionsService.findOne(userId, id);
  }

  /**
   * Создаёт операцию для текущего пользователя.
   *
   * @param userId - id текущего пользователя.
   * @param dto - данные создаваемой операции.
   * @returns Созданная операция вместе с её категорией (HTTP 201).
   * @throws {NotFoundException} Указанная категория не найдена или недоступна пользователю (HTTP 404).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание операции' })
  @ApiCreatedResponse({ description: 'Операция создана и возвращена вместе с её категорией' })
  @ApiBadRequestResponse({ description: 'Некорректные данные операции (сумма, тип, валюта, дата и т.д.)' })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionWithCategory> {
    return this.transactionsService.create(userId, dto);
  }

  /**
   * Изменяет операцию текущего пользователя.
   *
   * @param userId - id текущего пользователя.
   * @param id - id изменяемой операции.
   * @param dto - изменяемые поля операции.
   * @returns Обновлённая операция вместе с её категорией.
   * @throws {NotFoundException} Операция не найдена, либо новая категория не найдена/недоступна
   * пользователю (HTTP 404).
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Изменение операции' })
  @ApiParam({ name: 'id', description: 'id изменяемой операции' })
  @ApiOkResponse({ description: 'Обновлённая операция вместе с её категорией' })
  @ApiBadRequestResponse({ description: 'Некорректные данные операции' })
  @ApiNotFoundResponse({ description: 'Операция не найдена' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionWithCategory> {
    return this.transactionsService.update(userId, id, dto);
  }

  /**
   * Удаляет операцию текущего пользователя.
   *
   * @param userId - id текущего пользователя.
   * @param id - id удаляемой операции.
   * @returns Ничего не возвращает (HTTP 204).
   * @throws {NotFoundException} Операция не найдена или принадлежит другому пользователю (HTTP 404).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление операции' })
  @ApiParam({ name: 'id', description: 'id удаляемой операции' })
  @ApiNoContentResponse({ description: 'Операция удалена' })
  @ApiNotFoundResponse({ description: 'Операция не найдена' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<void> {
    return this.transactionsService.remove(userId, id);
  }
}
