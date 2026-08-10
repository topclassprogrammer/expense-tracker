# API

Базовый URL: `http://localhost:3001/api` (глобальный префикс `api` задаётся в `main.ts`). Интерактивная документация: `http://localhost:3001/api/docs` (Swagger, сгенерирован из тех же zod-схем, что валидируют запросы).

Все пути ниже указаны **без** префикса `/api` — `POST /auth/login` на деле означает `POST /api/auth/login`.

## Аутентификация и авторизация

- Если не указано `@Public()`, маршрут требует заголовок `Authorization: Bearer <accessToken>` — глобальный `JwtAuthGuard` подключён ко всем маршрутам через `APP_GUARD`.
- Access-токен живёт 15 минут (`JWT_ACCESS_EXPIRES_IN`), ни в каком хранилище на бэке не сохраняется.
- Refresh-токен живёт 7 дней (`JWT_REFRESH_EXPIRES_IN`), передаётся **только** через `httpOnly` cookie `refresh_token` (path `/`) — в теле запроса/ответа не участвует, недоступен из JS.
- Rate limit: **120 запросов в минуту** на клиента (`ThrottlerGuard`, ответ `429 Too Many Requests`).
- Формат ошибки — единый для всех эндпоинтов (`AllExceptionsFilter`):

```jsonc
{
  "statusCode": 400,
  "message": "Некорректные данные операции" /* или string[] от zod */,
  "error": "BadRequestException",
  "path": "/api/transactions",
  "timestamp": "2026-08-09T12:00:00.000Z"
}
```

- `Prisma.Decimal` (суммы) во всех ответах сериализуется в **строку** с двумя знаками после запятой (`DecimalSerializerInterceptor`), например `"amount": "1234.56"`.

---

## `POST /auth/register` — регистрация

**Auth:** `@Public()`.

Тело запроса (`registerSchema`):

| Поле | Тип | Правила |
|---|---|---|
| `email` | string | валидный email, приводится к нижнему регистру и обрезается |
| `password` | string | 8–72 символа, минимум одна строчная, одна заглавная буква и цифра |
| `name` | string | 2–60 символов |

Ответ `201`: `AuthResponse` (`{ accessToken: string, user: User }`); одновременно выставляется `httpOnly` cookie `refresh_token`.

Ошибки: `400` при нарушении схемы, `409` если email уже зарегистрирован.

## `POST /auth/login` — вход

**Auth:** `@Public()`.

Тело (`loginSchema`): `{ email: string, password: string }`.

Ответ `200`: `AuthResponse` + cookie `refresh_token`.

Ошибки: `401 "Неверный email или пароль"` — намеренно одинаковое сообщение и для несуществующего email, и для неверного пароля (не раскрывает факт регистрации).

## `POST /auth/refresh` — обновление пары токенов

**Auth:** `@Public()` + `JwtRefreshGuard` (читает и валидирует cookie `refresh_token`).

Тело запроса не требуется. Ответ `200`: `AuthResponse` + новая cookie `refresh_token` (старый refresh-токен отзывается — ротация).

Ошибки: `401`, если токен отсутствует/просрочен/отозван/не принадлежит пользователю — при этом cookie `refresh_token` **очищается** сервером (см. `AllExceptionsFilter`), чтобы фронтовый `middleware.ts` не зациклил редиректы.

## `POST /auth/logout` — выход

**Auth:** `@Public()` + `JwtRefreshGuard`.

Отзывает refresh-токен из cookie (если есть) и очищает cookie. Ответ `204`.

---

## `GET /users/me` — профиль текущего пользователя

Ответ `200`: `User` — `{ id, email, name, defaultCurrency, createdAt, updatedAt }` (без `passwordHash`).

## `PATCH /users/me` — обновление профиля

Тело (`updateUserSchema`, все поля опциональны):

| Поле | Тип | Правила |
|---|---|---|
| `name` | string | 2–60 символов |
| `defaultCurrency` | enum | одна из `CURRENCIES` |

Ответ `200`: обновлённый `User`.

## `POST /users/me/password` — смена пароля

Тело (`changePasswordSchema`):

| Поле | Тип | Правила |
|---|---|---|
| `currentPassword` | string | обязателен |
| `newPassword` | string | 8–72 символа, строчная + заглавная буква + цифра |

Ответ `204`. Отзывает **все** активные refresh-токены пользователя (все сессии на всех устройствах разлогиниваются).

Ошибки: `400 "Текущий пароль указан неверно"`.

---

## `GET /categories` — список категорий

Query (`categoryQuerySchema`):

| Параметр | Тип | По умолчанию | Назначение |
|---|---|---|---|
| `includeDefaults` | boolean | `true` | включать ли системные категории (`userId = null`) вместе с пользовательскими |

Ответ `200`: `Category[]`, отсортирован — сначала системные (`isDefault desc`), затем по имени.

## `GET /categories/:id` — категория по id

Ответ `200`: `Category`. `404`, если категория не найдена или принадлежит другому пользователю.

## `POST /categories` — создание категории

Тело (`createCategorySchema`):

| Поле | Тип | Правила |
|---|---|---|
| `name` | string | 1–40 символов |
| `icon` | string | 1–40 символов, по умолчанию `circle-ellipsis` (имя иконки `lucide-react`) |
| `color` | string | HEX `#RRGGBB`, по умолчанию `#64748b` |

Ответ `201`: созданная `Category` (`isDefault: false`, `userId` = текущий пользователь).

Ошибки: `409`, если у пользователя уже есть категория с таким именем (`@@unique([userId, name])`).

## `PATCH /categories/:id` — изменение категории

Тело — те же поля, все опциональны (`updateCategorySchema`).

Ошибки: `403`, если категория системная (`isDefault`/`userId = null`) — системные категории неизменяемы. `409` при конфликте имени.

## `DELETE /categories/:id` — удаление категории

Ответ `204`.

Ошибки: `403` для системной категории; `409`, если на категорию ссылается хотя бы одна операция (сообщение содержит их количество) — сначала нужно перенести операции в другую категорию.

---

## `GET /transactions` — список операций

Query (`transactionQuerySchema`):

| Параметр | Тип | По умолчанию | Назначение |
|---|---|---|---|
| `page` | int ≥ 1 | `1` | номер страницы |
| `limit` | int, 1–100 | `20` | размер страницы |
| `type` | `INCOME` \| `EXPENSE` | — | фильтр по типу |
| `categoryId` | string | — | фильтр по категории |
| `currency` | enum | — | фильтр по валюте |
| `dateFrom`, `dateTo` | date | — | диапазон по полю `date` (включительно) |
| `search` | string, ≤100 | — | поиск по `description` (регистронезависимый `contains`) |
| `sortBy` | `date` \| `amount` \| `createdAt` | `date` | поле сортировки |
| `sortOrder` | `asc` \| `desc` | `desc` | направление сортировки |

Ответ `200`: `Paginated<Transaction & { category: Category }>`:

```jsonc
{
  "items": [ /* операции с вложенной категорией */ ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

## `GET /transactions/summary` — сводка за месяц

> Маршрут объявлен **до** `GET /transactions/:id` в контроллере — иначе `summary` был бы перехвачен как значение `:id`.

Query (`transactionSummaryQuerySchema`) — **месяц и год обязательны**:

| Параметр | Тип | Правила |
|---|---|---|
| `month` | int | 1–12, обязателен |
| `year` | int | 2000–2100, обязателен |
| `currency` | enum | по умолчанию `RUB` |

Ответ `200` (`TransactionSummary`):

```jsonc
{
  "month": 8, "year": 2026, "currency": "RUB",
  "income": "150000.00", "expense": "87500.00", "net": "62500.00",
  "count": 34,
  "byCategory": [
    {
      "categoryId": "...", "categoryName": "Продукты", "color": "#22c55e",
      "type": "EXPENSE", "total": "23000.00", "count": 12,
      "percentage": 26.3 // доля внутри своего типа (INCOME/EXPENSE считаются раздельно)
    }
  ],
  "byDay": [ { "date": "2026-08-01", "income": "0.00", "expense": "1200.00" } ]
}
```

Суммы считаются в целых копейках (`toCents`/`fromCents` из `packages/shared/utils/money.ts`), чтобы избежать ошибок плавающей точки, и переводятся обратно в строку только в конце.

## `GET /transactions/:id` — операция по id

Ответ `200`: `Transaction & { category: Category }`. `404`, если не найдена или принадлежит другому пользователю.

## `POST /transactions` — создание операции

Тело (`createTransactionSchema`):

| Поле | Тип | Правила |
|---|---|---|
| `amount` | string \| number | до 10 цифр целой части, ≤2 знака после запятой, строго > 0 (`amountSchema`) |
| `type` | `INCOME` \| `EXPENSE` | по умолчанию `EXPENSE` |
| `currency` | enum | по умолчанию `RUB` |
| `date` | date | по умолчанию текущая дата |
| `description` | string, ≤500 | опционально |
| `categoryId` | string | обязателен |

Ответ `201`: созданная операция вместе с категорией.

Ошибки: `400` при нарушении схемы; `404`, если `categoryId` не существует или недоступна пользователю (не системная и не его собственная).

## `PATCH /transactions/:id` — изменение операции

Тело — те же поля, все опциональны (`updateTransactionSchema`). Если передан `categoryId`, он проверяется так же, как при создании.

## `DELETE /transactions/:id` — удаление операции

Ответ `204`. `404`, если операция не найдена или чужая.

---

## `GET /health` — проверка живости

**Auth:** `@Public()`.

Ответ `200`: статус сервиса и доступность PostgreSQL (`SELECT 1`).

---

## Сущность `Budget` — не реализована на уровне API

В схеме БД (`prisma/schema.prisma`) есть модель `Budget` (лимит по категории или общий на месяц, период в формате `YYYY-MM`), а также zod-схема (`packages/shared/schemas/budget.schema.ts`), но контроллера/сервиса для неё в `apps/backend/src/modules` нет — это задел на будущее, эндпоинтов `/budgets` не существует.
