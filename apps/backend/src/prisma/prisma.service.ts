import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Глобальный Prisma-клиент с хуками жизненного цикла Nest: подключается к БД
 * при старте модуля и закрывает соединение при остановке приложения.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  /**
   * Хук Nest: открывает соединение с PostgreSQL при инициализации модуля.
   *
   * @returns Ничего не возвращает.
   * @throws {Error} Не удалось подключиться к базе данных (например, недоступен хост или неверный `DATABASE_URL`).
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Подключение к PostgreSQL установлено');
  }

  /**
   * Хук Nest: закрывает соединение с PostgreSQL при остановке приложения.
   *
   * @returns Ничего не возвращает.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
