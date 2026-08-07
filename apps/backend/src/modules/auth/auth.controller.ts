import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetUserByIdQuery } from '../users/queries/get-user-by-id.query';

import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './auth.constants';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

import type { RefreshRequestUser } from './strategies/jwt-refresh.strategy';
import type { AuthResponse } from '@expense-tracker/shared';
import type { CookieOptions, Response } from 'express';

import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtRefreshGuard } from '@/common/guards/jwt-refresh.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly queryBus: QueryBus,
    private readonly config: ConfigService,
  ) {}

  /** Регистрация нового пользователя. */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { refreshToken, ...result } = await this.authService.register(dto);
    this.setRefreshCookie(response, refreshToken);
    return result;
  }

  /** Вход по email и паролю. */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { refreshToken, ...result } = await this.authService.login(dto);
    this.setRefreshCookie(response, refreshToken);
    return result;
  }

  /** Обновление пары токенов по refresh-cookie. */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Обновление access-токена' })
  async refresh(
    @CurrentUser() user: RefreshRequestUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { refreshToken, ...result } = await this.authService.refresh(user.id, user.refreshToken);
    this.setRefreshCookie(response, refreshToken);
    return result;
  }

  /** Выход: отзыв refresh-токена и очистка cookie. */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Выход' })
  async logout(
    @CurrentUser() user: RefreshRequestUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(user.refreshToken);
    response.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  /** Текущий пользователь по access-токену. */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  me(@CurrentUser() user: RequestUser) {
    return this.queryBus.execute(new GetUserByIdQuery(user.id));
  }

  private setRefreshCookie(response: Response, token: string): void {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    const options: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      domain: this.config.get<string>('COOKIE_DOMAIN'),
      path: REFRESH_COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    response.cookie(REFRESH_COOKIE_NAME, token, options);
  }
}
