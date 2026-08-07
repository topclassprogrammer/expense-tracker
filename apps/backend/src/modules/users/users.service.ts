import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import * as argon2 from 'argon2';

import { UserPasswordChangedEvent } from './events/user-password-changed.event';

import type { CreateUserCommand } from './commands/create-user.command';
import type { ChangePasswordDto, UpdateUserDto } from './dto/user.dto';
import type { User } from '@expense-tracker/shared';
import type { User as PrismaUser } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  /** Создаёт пользователя. Владелец логики регистрации — users-домен. */
  async create(dto: CreateUserCommand): Promise<PrismaUser> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: await argon2.hash(dto.password),
      },
    });
  }

  /** Полная запись пользователя (включая passwordHash) для сверки credentials при логине. */
  findByEmailWithPassword(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: PUBLIC_USER_SELECT,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await argon2.hash(dto.newPassword) },
    });

    // Отзыв всех сессий — зона ответственности auth-домена, обрабатывается по событию.
    this.eventBus.publish(new UserPasswordChangedEvent(id));
  }
}

/** Поля пользователя, безопасные для отдачи наружу. */
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  defaultCurrency: true,
  createdAt: true,
  updatedAt: true,
} as const;
