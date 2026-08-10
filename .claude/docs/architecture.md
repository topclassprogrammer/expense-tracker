# Архитектура

## Обзор

Expense Tracker — монорепозиторий на npm workspaces, оркестрируемый Turborepo. Состоит из четырёх пакетов:

```
expense-tracker/
├── apps/
│   ├── backend/    # NestJS 11 REST API
│   └── frontend/   # Next.js 15 (App Router)
├── packages/
│   ├── shared/     # zod-схемы, типы, утилиты — общие для backend и frontend
│   └── config/     # общие пресеты tsconfig / ESLint / Prettier
└── docker-compose.yml   # PostgreSQL для локальной разработки
```

Turborepo строит граф зависимостей по `package.json`: `packages/shared` собирается раньше `apps/*`, т.к. оба приложения импортируют его как обычный npm-пакет (`@expense-tracker/shared`).

## Ключевой принцип: единый источник валидации

`packages/shared` содержит zod-схемы (`schemas/*.schema.ts`) для всех доменных сущностей — `User`, `Category`, `Transaction`, `Budget`, `auth`. Эти схемы используются в двух местах одновременно:

- **Backend** — `nestjs-zod` (`createZodDto`) превращает zod-схему в класс DTO, который валидирует тело запроса через глобальный `ZodValidationPipe` (`APP_PIPE` в `app.module.ts`).
- **Frontend** — те же схемы подключаются к `react-hook-form` через `@hookform/resolvers/zod`, так что валидация формы на клиенте буквально совпадает с валидацией на сервере.

Так исключён класс багов «на фронте разрешили то, что бэк отклоняет» и наоборот. Любое изменение бизнес-правила (например, диапазон суммы или формат цвета категории) делается один раз в `packages/shared`.

`packages/shared` также содержит:
- `constants/` — списки валют (`CURRENCIES`), системных категорий (`DEFAULT_CATEGORIES`), типов операций;
- `utils/money.ts`, `utils/date.ts` — денежная арифметика в копейках и работа с периодами (используются и в `TransactionsService.summary()` на бэке, и при форматировании на фронте).

## Backend: слоистая архитектура NestJS + CQRS для кросс-модульных обращений

```
Controller → Service → PrismaService → PostgreSQL
                ↑
         QueryBus / CommandBus / EventBus (@nestjs/cqrs)
```

- **Controller** — тонкий слой: разбор запроса, вызов сервиса, HTTP-статусы, Swagger-аннотации. Бизнес-логики не содержит.
- **Service** — вся бизнес-логика модуля (CRUD, проверки владения, агрегации).
- **PrismaService** — единственная точка доступа к БД, глобальный модуль (`PrismaModule`).

### Зачем здесь CQRS

`@nestjs/cqrs` используется не для полноценного Event Sourcing, а точечно — чтобы один модуль мог обратиться к данным другого модуля, не создавая прямой зависимости (не импортируя его `Service` напрямую). Примеры:

| Где | Что | Зачем |
|---|---|---|
| `TransactionsService.create/update` | `FindCategoryByIdQuery` → `categories`-модуль | Проверить, что категория существует и принадлежит пользователю (или системная), не импортируя `CategoriesService` |
| `CategoriesService.remove` | `CountTransactionsByCategoryQuery` → `transactions`-модуль | Запретить удаление категории, если на неё ссылаются операции |
| `UsersService.changePassword` | публикует `UserPasswordChangedEvent`, слушает `auth`-модуль (`user-password-changed.handler.ts`) | Смена пароля отзывает все refresh-сессии — это зона ответственности `auth`, а не `users` |
| `AuthService.register/login` | `CreateUserCommand`, `FindUserByEmailQuery` → `users`-модуль | Владелец логики создания/поиска пользователя — модуль `users` |

`CqrsModule.forRoot()` подключён один раз в `app.module.ts` и делает шины глобальными — локальный импорт `CqrsModule` в модулях не нужен.

### Глобальные провайдеры (`app.module.ts`)

Подключены через `APP_*`-токены и действуют на все маршруты без явного подключения в контроллерах:

| Токен | Класс | Назначение |
|---|---|---|
| `APP_PIPE` | `ZodValidationPipe` | Валидация DTO по zod-схемам из `shared` |
| `APP_GUARD` (1) | `JwtAuthGuard` | Требует валидный access-токен; маршруты с `@Public()` пропускаются |
| `APP_GUARD` (2) | `ThrottlerGuard` | Rate limiting — 120 запросов/мин на клиента |
| `APP_INTERCEPTOR` | `DecimalSerializerInterceptor` | Рекурсивно превращает `Prisma.Decimal` в строку в любом ответе |
| `APP_FILTER` | `AllExceptionsFilter` | Единый формат ошибок, маппинг кодов Prisma, сброс refresh-cookie при 401 на `/auth/refresh` |

### Аутентификация: access/refresh с ротацией

- **Access-токен** (JWT, по умолчанию 15 мин) — выдаётся клиенту, нигде на бэке не хранится, проверяется `JwtStrategy` (`passport-jwt`).
- **Refresh-токен** (JWT, по умолчанию 7 дней) — уходит в `httpOnly` cookie (`refresh_token`, path `/`, а не `/api/auth` — иначе `middleware.ts` на фронте её не увидит). В БД хранится только SHA-256 от токена (`refresh_tokens.tokenHash`), не сам токен.
- Каждый `POST /auth/refresh` **ротирует** refresh-токен: старый помечается `revokedAt`, выдаётся новая пара. Ротация защищена `jwtid` (`randomUUID()`) в payload — без него два одновременных refresh-запроса от одного пользователя (например, параллельные вкладки) дают побайтово идентичный токен и падают на `@@unique(tokenHash)`.
- Смена пароля (`POST /users/me/password`) публикует `UserPasswordChangedEvent`, на который подписан `auth`-модуль и отзывает **все** активные refresh-токены пользователя.

Подробности про guard'ы и стратегии — в `apps/backend/CLAUDE.md`.

## Frontend: App Router + серверное состояние через React Query

```
app/                      # маршруты (route groups (auth) / (dashboard))
  (auth)/login, register  # гостевые страницы
  (dashboard)/...         # защищённые страницы: /, /categories, /settings
components/                # UI-компоненты по доменам (transactions, categories, layout, ui)
hooks/                     # React Query хуки — единственная точка обращения к API из компонентов
lib/api-client.ts          # axios-инстанс + интерсептор обновления токена
store/                     # zustand: access-токен в памяти (auth-store), UI-состояние (ui-store)
middleware.ts              # редирект гостя/авторизованного по наличию refresh-cookie
```

### Поток аутентификации на клиенте

1. Access-токен хранится **только в памяти** (`zustand`, `auth-store.ts`) — не в `localStorage`/cookie, чтобы уменьшить поверхность для XSS.
2. При обновлении страницы (F5) access-токен теряется. `auth-bootstrap.tsx` при старте приложения вызывает `restoreSession()` (`lib/api-client.ts`), которая дёргает `/auth/refresh` по httpOnly cookie и восстанавливает токен в сторе.
3. `apiClient` (axios) на каждый запрос подставляет `Authorization: Bearer <accessToken>` из стора.
4. При ответе `401` интерсептор один раз обновляет токен через `/auth/refresh` и повторяет исходный запрос. Параллельные `401` от разных запросов **не** плодят несколько refresh-вызовов — используется общий `refreshPromise`, иначе два одновременных refresh отозвали бы токен друг друга (см. ротацию выше).
5. `middleware.ts` на каждый переход по App Router грубо проверяет наличие refresh-cookie (сам токен не валидирует — это делает бэкенд) и редиректит гостя на `/login`, а авторизованного — с `/login`/`/register` на `/`.

### Серверное состояние

`@tanstack/react-query` — единственный источник серверных данных в компонентах; ключи кэша централизованы в `lib/query-keys.ts`. Компоненты не обращаются к `apiClient` напрямую — только через хуки в `hooks/*`.

## Инфраструктура

- **PostgreSQL** поднимается через `docker-compose.yml` (`npm run docker:up`), схема управляется Prisma Migrate (`apps/backend/prisma/migrations`).
- Переменные окружения валидируются zod-схемой при старте бэкенда (`config/env.schema.ts`) — приложение не запустится с неполным/некорректным `.env`.
- Swagger генерируется автоматически из тех же zod DTO (`patchNestJsSwagger()` в `main.ts`) — `http://localhost:3001/api/docs`.

## Схема потока запроса (пример: создание операции)

```
Frontend                         Backend
────────                         ───────
react-hook-form
  + createTransactionSchema  →   POST /api/transactions
  (валидация на клиенте)         │
                                  ZodValidationPipe (та же схема)
                                  │
                                  JwtAuthGuard → CurrentUser(id)
                                  │
                                  TransactionsController.create
                                  │
                                  TransactionsService.create
                                  │  └─ QueryBus → FindCategoryByIdQuery
                                  │      (проверка владения категорией
                                  │       без прямой зависимости от CategoriesService)
                                  │
                                  PrismaService.transaction.create
                                  │
                                  DecimalSerializerInterceptor
                                  (Decimal → string перед отдачей)
```
