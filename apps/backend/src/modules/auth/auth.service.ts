import { createHash, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { CreateUserCommand } from '../users/commands/create-user.command';
import { FindUserByEmailQuery } from '../users/queries/find-user-by-email.query';

import type { LoginDto, RegisterDto } from './dto/auth.dto';
import type { AuthResponse, JwtPayload, User } from '@expense-tracker/shared';
import type { User as PrismaUser } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse & { refreshToken: string }> {
    const user = await this.commandBus.execute<CreateUserCommand, PrismaUser>(
      new CreateUserCommand(dto.email, dto.name, dto.password),
    );

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse & { refreshToken: string }> {
    const user = await this.queryBus.execute<FindUserByEmailQuery, PrismaUser | null>(
      new FindUserByEmailQuery(dto.email),
    );

    // Одинаковое сообщение для несуществующего email и неверного пароля —
    // чтобы не раскрывать факт регистрации.
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.issueTokens(user);
  }

  /** Ротация: старый refresh-токен отзывается, выдаётся новая пара. */
  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponse & { refreshToken: string }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.userId !== userId) {
      throw new UnauthorizedException('Refresh-токен недействителен');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Отзывает все активные сессии пользователя (например, при смене пароля). */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: PrismaUser): Promise<AuthResponse & { refreshToken: string }> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
      }),
      // jwtid обязателен: без него два refresh-запроса в одну секунду для
      // одного пользователя дают побайтово идентичный токен, и вставка в БД
      // падает на @@unique(tokenHash) — так уже случалось при параллельных вкладках.
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
        jwtid: randomUUID(),
      }),
    ]);

    const decoded = this.jwt.decode<{ exp: number }>(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}

/** В БД хранится только SHA-256 от токена. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function toPublicUser(user: PrismaUser): User {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
