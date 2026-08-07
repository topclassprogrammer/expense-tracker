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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { CategoryQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

import type { Category } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** Список категорий пользователя и системных. */
  @Get()
  @ApiOperation({ summary: 'Список категорий' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: CategoryQueryDto,
  ): Promise<Category[]> {
    return this.categoriesService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Категория по id' })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание категории' })
  @ApiConflictResponse({ description: 'Категория с таким названием уже существует' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменение категории' })
  @ApiForbiddenResponse({ description: 'Системную категорию нельзя изменить' })
  @ApiConflictResponse({ description: 'Категория с таким названием уже существует' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление категории' })
  @ApiForbiddenResponse({ description: 'Системную категорию нельзя удалить' })
  @ApiConflictResponse({ description: 'Категория используется в операциях' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(userId, id);
  }
}
