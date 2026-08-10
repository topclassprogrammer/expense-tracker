# Схема БД

PostgreSQL, схема описана в `apps/backend/prisma/schema.prisma`, миграции — `apps/backend/prisma/migrations`. Все id — `cuid()`. Денежные суммы — `Decimal(12, 2)` (12 значащих цифр, 2 после запятой); API отдаёт их строкой (см. `api.md`), чтобы не терять точность при сериализации в JSON.

## ER-обзор

```
User 1──* RefreshToken
User 1──* Category      (userId = null → системная категория, общая для всех)
User 1──* Transaction ──* Category   (Restrict: категорию с операциями удалить нельзя)
User 1──* Budget      ──* Category?  (Cascade: категория удалена → её бюджеты удаляются)
```

---

## `users`

Профиль и учётные данные пользователя.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | `String @id @default(cuid())` | Первичный ключ |
| `email` | `String @unique` | Логин, уникален глобально |
| `passwordHash` | `String` | Хеш пароля (`argon2`), наружу через API никогда не отдаётся (`toPublicUser()` в `auth.service.ts` явно вырезает поле) |
| `name` | `String` | Отображаемое имя, 2–60 символов на уровне валидации |
| `defaultCurrency` | `Currency @default(RUB)` | Валюта по умолчанию для новых операций/сводки |
| `createdAt` / `updatedAt` | `DateTime` | Автоуправляемые Prisma (`@default(now())` / `@updatedAt`) |

Связи: `refreshTokens`, `categories`, `transactions`, `budgets` — все с `onDelete: Cascade` со стороны потомков, то есть удаление пользователя каскадно удаляет все его данные.

---

## `refresh_tokens`

Хранит **только хеш** refresh-JWT, не сам токен — компрометация БД не даёт возможности восстановить рабочий токен. Ротация происходит на каждый `/auth/refresh`: старая запись помечается `revokedAt`, создаётся новая.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | `String @id @default(cuid())` | Первичный ключ |
| `tokenHash` | `String @unique` | SHA-256 от JWT refresh-токена (`createHash('sha256')` в `auth.service.ts`) |
| `userId` | `String` | Владелец, `onDelete: Cascade` |
| `expiresAt` | `DateTime` | Момент истечения — берётся из `exp` внутри самого JWT, не пересчитывается отдельно |
| `revokedAt` | `DateTime?` | `null`, пока токен активен; проставляется при ротации, logout или смене пароля |
| `userAgent`, `ip` | `String?` | Зарезервированы для аудита сессий (в коде сейчас не заполняются) |
| `createdAt` | `DateTime` | Момент выдачи |

Индексы: `@@index([userId])` (отзыв всех сессий пользователя), `@@index([expiresAt])` (потенциальная очистка просроченных записей).

**Почему JWT, а не просто случайная строка:** `refresh.strategy.ts` проверяет подпись до похода в БД, а `jwtid` (`randomUUID()`) гарантирует уникальность даже при двух refresh-запросах в одну секунду — иначе вставка падала бы на `@@unique(tokenHash)`.

---

## `categories`

Категории операций. `userId = null` — **системная** категория (десять штук, создаются сидом `prisma/seed.ts` из `DEFAULT_CATEGORIES`), видна и используется всеми пользователями, но не редактируется и не удаляется никем.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | `String @id @default(cuid())` | Первичный ключ |
| `name` | `String` | Название, 1–40 символов |
| `icon` | `String @default("circle-ellipsis")` | Имя иконки `lucide-react` — фронт резолвит строку в компонент через таблицу в `category-icon.tsx` |
| `color` | `String @default("#64748b")` | HEX `#RRGGBB`, используется в бейджах и для сегментов сводки (`byCategory[].color`) |
| `isDefault` | `Boolean @default(false)` | `true` только для системных категорий; ставится сидом, а не пользователем |
| `userId` | `String?` | `null` = системная; иначе владелец, `onDelete: Cascade` |
| `createdAt` / `updatedAt` | `DateTime` | Автоуправляемые |

Ограничения: `@@unique([userId, name])` — у одного пользователя не может быть двух категорий с одинаковым именем (Postgres не учитывает `NULL` в уникальном индексе, поэтому системные категории с одинаковым именем **не** конфликтуют друг с другом — по этой же причине `seed.ts` ищет системные категории вручную, а не через `upsert`). `@@index([userId])`.

Удаление защищено на уровне сервиса (`CategoriesService.remove`): если на категорию ссылается хотя бы одна операция, удаление отклоняется (`409`) — на уровне БД это выражено как `onDelete: Restrict` у `Transaction.category`.

---

## `transactions`

Операция пользователя — доход или расход.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | `String @id @default(cuid())` | Первичный ключ |
| `amount` | `Decimal @db.Decimal(12, 2)` | Сумма, всегда положительная (проверяется на уровне zod, не БД) |
| `type` | `TransactionType @default(EXPENSE)` | `INCOME` \| `EXPENSE` |
| `currency` | `Currency @default(RUB)` | Валюта операции (не обязательно `defaultCurrency` пользователя) |
| `date` | `DateTime @db.Date` | Дата операции **без времени** — конкретный календарный день (важно для группировки `byDay` в сводке) |
| `description` | `String? @db.VarChar(500)` | Опциональный комментарий, участвует в поиске (`search` в `GET /transactions`) |
| `categoryId` | `String` | Обязательная категория; `onDelete: Restrict` — Postgres не даст удалить категорию, пока есть операции с этим `categoryId` |
| `userId` | `String` | Владелец, `onDelete: Cascade` |
| `createdAt` / `updatedAt` | `DateTime` | Автоуправляемые |

Индексы — все под типичные запросы модуля `transactions`:
- `@@index([userId, date])` — список/сводка за период, сортировка по дате;
- `@@index([userId, categoryId])` — фильтр по категории, подсчёт операций при удалении категории;
- `@@index([userId, type, date])` — сводка (доходы/расходы за месяц).

---

## `budgets`

Лимит расходов на период `YYYY-MM` (`@db.VarChar(7)`, формат валидируется `budgetPeriodSchema` в `packages/shared`). **Модель существует в схеме и в общих zod-типах, но REST API для неё пока не реализован** — эндпоинтов `/budgets` нет ни в одном контроллере (см. `api.md`).

| Поле | Тип | Назначение |
|---|---|---|
| `id` | `String @id @default(cuid())` | Первичный ключ |
| `amount` | `Decimal @db.Decimal(12, 2)` | Лимит суммы |
| `currency` | `Currency @default(RUB)` | Валюта лимита |
| `period` | `String @db.VarChar(7)` | Месяц в формате `YYYY-MM` |
| `categoryId` | `String?` | `null` = общий бюджет на весь месяц, иначе лимит по конкретной категории; `onDelete: Cascade` — бюджет умирает вместе с категорией |
| `userId` | `String` | Владелец, `onDelete: Cascade` |
| `createdAt` / `updatedAt` | `DateTime` | Автоуправляемые |

Ограничения: `@@unique([userId, categoryId, period])` — не более одного бюджета на пару (категория, период) у пользователя; `@@index([userId, period])`.

---

## Перечисления

```prisma
enum Currency {
  RUB  USD  EUR  GBP  KZT  BYN  UAH
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

`Currency` и список системных категорий определены не в Prisma-схеме, а продублированы как источник правды в `packages/shared/src/constants/currencies.ts` и `categories.ts` — Prisma enum описывает физическое ограничение колонки в БД, а константы `shared` используются в zod-схемах и на фронте (например, для выпадающего списка валют).

## Миграции

```bash
npm run db:migrate   # prisma migrate dev — создать/применить миграцию в разработке
npm run db:deploy    # prisma migrate deploy — применить существующие миграции (CI/прод)
npm run db:reset      # сброс БД + повторное применение всех миграций
npm run db:studio     # Prisma Studio — GUI для просмотра/редактирования данных
npm run db:seed       # создаёт/обновляет 10 системных категорий (idempotent)
```

История миграций: `20260806083714_init` (базовые таблицы), `20260807120000_add-transactions` (добавление `transactions`).
