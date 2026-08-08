## Project Overview

Backend трекера расходов: REST API на NestJS для операций (доходы/расходы), категорий, месячной сводки и аутентификации по JWT. Слой данных и API рабочие, проверены сквозным сценарием (регистрация → логин → CRUD операций → сводка → ротация refresh-токена).

## Tech Stack

- NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`).
- Prisma 6 / PostgreSQL — доступ к данным и миграции.
- `nestjs-zod` — превращает zod-схемы из `@expense-tracker/shared` в DTO.
- `@nestjs/cqrs` — кросс-модульные запросы (например, `CountTransactionsByCategoryQuery`).
- `passport-jwt` + `@nestjs/jwt` — access/refresh JWT-аутентификация.
- `argon2` — хэширование паролей.
- `@nestjs/swagger` — автогенерируемая документация (патчится на чтение zod-схем).
- `@nestjs/throttler` — rate limiting.
- `tsc-alias`, `tsconfig-paths` — резолв алиасов `@/*` в собранном коде и в seed-скрипте.

## Commands

Запускать можно из корня монорепо или напрямую в этом workspace.

```bash
npm run dev:backend --workspace @expense-tracker/backend   # nest start --watch (:3001)
npm run build --workspace @expense-tracker/backend         # prisma generate + nest build + tsc-alias
npm run start --workspace @expense-tracker/backend          # node dist/main
npm run lint --workspace @expense-tracker/backend
npm run typecheck --workspace @expense-tracker/backend

npm run db:migrate --workspace @expense-tracker/backend    # prisma migrate dev
npm run db:seed --workspace @expense-tracker/backend        # системные категории
npm run db:studio --workspace @expense-tracker/backend
npm run db:reset --workspace @expense-tracker/backend       # сброс БД и повторные миграции
```

**Перед `db:seed` и `typecheck` `packages/shared` должен быть собран** (`npm run build --workspace @expense-tracker/shared`) — иначе `TS2307`, так как оба скрипта вызываются напрямую, минуя Turborepo.

Тесты не настроены — заготовка каталога `apps/backend/test/`.

Swagger: http://localhost:3001/api/docs. Health: `/api/health`.

## File Structure

```
src/
├── main.ts                                          # Bootstrap: helmet, CORS, cookie-parser, Swagger
├── app.module.ts                                     # Корневой модуль — глобальные pipe/guard/interceptor/filter
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts                 # @CurrentUser() — достаёт пользователя из request
│   │   └── public.decorator.ts                        # @Public() — помечает маршрут не требующим JWT
│   ├── filters/
│   │   └── http-exception.filter.ts                   # AllExceptionsFilter — единый формат ошибок + сброс cookie
│   ├── guards/
│   │   ├── jwt-auth.guard.ts                           # Проверка access-токена (глобальный APP_GUARD)
│   │   └── jwt-refresh.guard.ts                        # Проверка refresh-токена для /auth/refresh
│   ├── interceptors/
│   │   └── decimal-serializer.interceptor.ts           # Приводит Prisma.Decimal к строке в любом ответе
│   └── index.ts                                        # Публичные экспорты common/
├── config/
│   ├── config.module.ts                                # Глобальный ConfigModule (envFilePath, validate)
│   ├── env.schema.ts                                    # zod-схема окружения — приложение не стартует без валидного .env
│   └── index.ts
├── prisma/
│   ├── prisma.module.ts                                 # Глобальный модуль PrismaService
│   ├── prisma.service.ts                                # PrismaClient с хуками жизненного цикла Nest
│   └── index.ts
└── modules/
    ├── auth/
    │   ├── auth.controller.ts                           # /auth: register, login, refresh, logout
    │   ├── auth.service.ts                               # Выдача/ротация JWT, хэширование паролей (argon2)
    │   ├── auth.module.ts
    │   ├── auth.constants.ts                             # Имя/путь/TTL refresh-cookie
    │   ├── dto/auth.dto.ts                                # DTO из zod-схем shared (login/register/refresh)
    │   ├── strategies/
    │   │   ├── jwt.strategy.ts                            # Passport-стратегия для access-токена
    │   │   └── jwt-refresh.strategy.ts                    # Passport-стратегия для refresh-токена (читает cookie)
    │   └── handlers/
    │       └── user-password-changed.handler.ts          # На UserPasswordChangedEvent отзывает все сессии пользователя
    ├── users/
    │   ├── users.controller.ts                           # /users/me
    │   ├── users.service.ts                               # CRUD пользователя, смена пароля
    │   ├── users.module.ts
    │   ├── dto/user.dto.ts
    │   ├── commands/
    │   │   ├── create-user.command.ts                     # CQRS-команда регистрации
    │   │   └── create-user.handler.ts
    │   ├── queries/
    │   │   ├── find-user-by-email.query.ts                # Используется AuthService при логине
    │   │   └── find-user-by-email.handler.ts
    │   └── events/
    │       └── user-password-changed.event.ts             # Триггерит отзыв сессий в модуле auth
    ├── categories/
    │   ├── categories.controller.ts                       # /categories — CRUD
    │   ├── categories.service.ts                           # assertOwned: системные (userId = null) нельзя менять
    │   ├── categories.module.ts
    │   ├── dto/category.dto.ts
    │   └── queries/
    │       ├── find-category-by-id.query.ts                # Используется TransactionsService.create для проверки принадлежности
    │       └── find-category-by-id.handler.ts
    ├── transactions/
    │   ├── transactions.controller.ts                      # /transactions — CRUD + /transactions/summary
    │   ├── transactions.service.ts                          # income/expense/net, byCategory, byDay
    │   ├── transactions.module.ts
    │   ├── dto/transaction.dto.ts
    │   └── queries/
    │       ├── count-transactions-by-category.query.ts     # Защита от удаления категории с операциями
    │       └── count-transactions-by-category.handler.ts
    └── health/
        ├── health.controller.ts                            # /health
        └── health.module.ts
```

### Аутентификация

- Access-токен (15 мин) выдаётся клиенту и нигде на бэке не хранится.
- Refresh-токен (7 дней) — httpOnly cookie; в БД хранится только его SHA-256 (`refresh_tokens.tokenHash`). При каждом `/auth/refresh` старый токен отзывается (ротация).
- Cookie имеет путь `/`, а не `/api/auth` — иначе фронтовый `middleware.ts` не увидит её. Причина зафиксирована в `src/modules/auth/auth.constants.ts`.
- `JwtAuthGuard` подключён глобально через `APP_GUARD`: все маршруты защищены по умолчанию, публичные помечаются `@Public()`.
