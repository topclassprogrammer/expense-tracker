import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';

import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';

import { AllExceptionsFilter } from '@/common/filters/http-exception.filter';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { DecimalSerializerInterceptor } from '@/common/interceptors/decimal-serializer.interceptor';
import { ConfigModule } from '@/config/config.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    // forRoot() делает CommandBus/QueryBus/EventBus глобальными — доступны в любом
    // модуле без локального импорта CqrsModule.
    CqrsModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ExpensesModule,
    HealthModule,
  ],
  providers: [
    // Валидация всех входящих DTO по zod-схемам из shared
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Авторизация по умолчанию для всех маршрутов, кроме @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: DecimalSerializerInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
