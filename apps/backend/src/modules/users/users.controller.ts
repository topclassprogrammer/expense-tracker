import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ChangePasswordDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

import type { User } from '@expense-tracker/shared';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Профиль текущего пользователя. */
  @Get('me')
  @ApiOperation({ summary: 'Профиль' })
  me(@CurrentUser('id') userId: string): Promise<User> {
    return this.usersService.findById(userId);
  }

  /** Обновление имени и валюты по умолчанию. */
  @Patch('me')
  @ApiOperation({ summary: 'Обновление профиля' })
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto): Promise<User> {
    return this.usersService.update(userId, dto);
  }

  /** Смена пароля: отзывает все активные refresh-токены. */
  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Смена пароля' })
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.usersService.changePassword(userId, dto);
  }
}
