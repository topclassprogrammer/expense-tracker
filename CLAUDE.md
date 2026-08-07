# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Общение

Отвечать пользователю на русском. Комментарии в коде — на русском, идентификаторы и технические термины — в оригинальном виде.

## Коммиты

Формат — Conventional Commits: `<type>: <краткое описание>` (при необходимости `<type>(scope): ...`). Заголовок на английском, императив, без точки в конце. Типы: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`. Тело коммита (если есть) объясняет **почему**, а не пересказывает диф.

Коммитить только по явной просьбе пользователя — не создавать коммиты проактивно после каждой правки.

## Ветки (GitHub Flow)

Работа над фичами идёт по GitHub Flow: `main` всегда в рабочем состоянии, вся разработка — в отдельных ветках.

- Именование: `feature/<название>` для новой функциональности, `fix/<название>` для багфиксов.
- Новая ветка создаётся от актуального `main` перед началом работы над фичей/фиксом.
- Мержить в `main` через Pull Request, не пушить напрямую в `main`.
- Ветку создавать проактивно в начале работы над задачей, не дожидаясь отдельной просьбы.

### Pull Request

PR создаётся только по явной просьбе пользователя (как и коммиты). Title — по Conventional Commits, тем же форматом, что и заголовки коммитов. Перед описанием смотреть `git diff main` (или `git diff main...HEAD`), чтобы описание отражало реальный диф, а не пересказ задачи. В теле — краткая сводка, что реализовано (эндпоинты, экраны, компоненты), и test plan.

`gh` CLI в этом окружении не установлен — PR оформляется через страницу `compare` в браузере (Chrome MCP): поле описания на GitHub автопродолжает списки при посимвольном вводе (`type`) и задваивает `-`/чекбоксы, поэтому текст нужно проставлять через `javascript_tool`, устанавливая `value` textarea напрямую нативным сеттером с последующим `dispatchEvent(new Event('input', { bubbles: true }))`.

## Статус проекта

Слой данных и API рабочие. Из UI готовы `/login`, `/register`, `/categories` и главный экран `/`: сводка за месяц, фильтры (период / тип / категория), список операций с пагинацией по 10, диалоги создания, редактирования и удаления операции, дропдаун профиля в шапке. Отдельной страницы `/expenses` больше нет — работа с операциями целиком на главном экране. Не сделаны: форма профиля и смены пароля на `/settings` (там остался `TODO`), графики (`recharts` в зависимостях, но нигде не импортируется; готовая серия для тренда — `summary.byDay`).

Окружение уже поднято: зависимости установлены, миграции `init` и `add-transactions` применены, сид системных категорий выполнен, контейнер PostgreSQL запущен. API проверен сквозным сценарием (регистрация → логин → CRUD операций → сводка → ротация refresh-токена).

### Локальные особенности этой машины

- На хосте работает служба `postgresql-x64-16`, занимающая **5432**. Контейнер проекта поэтому слушает **5433** — это прописано в локальных `.env` (`POSTGRES_PORT`, `DATABASE_URL`), но `.env.example` намеренно оставлен на стандартном 5432. При проблемах с подключением сначала проверить, на какой порт смотрит `DATABASE_URL`.
- `.env`, `apps/backend/.env`, `apps/frontend/.env.local` уже созданы с валидными JWT-секретами и не попадают в git.

## Команды

Все команды запускаются из корня; Turborepo сам выстраивает порядок сборки (`packages/shared` собирается перед `apps/*`).

```bash
npm run dev           # frontend (:3000) + backend (:3001) одновременно
npm run dev:backend   # только backend
npm run dev:frontend  # только frontend
npm run build         # сборка всех пакетов
npm run lint          # ESLint по всему монорепо
npm run typecheck     # tsc --noEmit по всем пакетам
npm run format        # Prettier

npm run docker:up     # PostgreSQL
npm run db:migrate    # prisma migrate dev
npm run db:seed       # системные категории
npm run db:studio     # Prisma Studio
npm run db:reset      # сброс БД и повторные миграции
```

Для одного пакета: `npm run <script> --workspace @expense-tracker/backend` или `turbo run <task> --filter=@expense-tracker/frontend`.

Пакетный менеджер — **npm workspaces** (список пакетов в поле `workspaces` корневого `package.json`, локальные зависимости указываются как `"*"`, а не `workspace:*`).

**`packages/shared` должен быть собран раньше всего, что его импортирует.** `npm run db:seed` и `npm run typecheck` вызываются напрямую, минуя Turborepo, и упадут с `TS2307`, если `packages/shared/dist` пуст. Лечится `npm run build --workspace @expense-tracker/shared`.

Тесты не настроены — если понадобятся, тестовый фреймворк нужно добавлять с нуля (заготовка каталога: `apps/backend/test/`).

Swagger: http://localhost:3001/api/docs. Health: `/api/health`.

## Архитектура

Четыре workspace-пакета: `apps/backend`, `apps/frontend`, `packages/shared`, `packages/config`.

### Единый контракт через packages/shared

Ключевая идея всей структуры: **zod-схемы в `packages/shared/src/schemas/` — единственный источник правды для DTO**.

- Backend: `createZodDto(schema)` из `nestjs-zod` превращает схему в класс DTO; глобальный `ZodValidationPipe` (`apps/backend/src/app.module.ts`) валидирует по ней вход, а `patchNestJsSwagger()` в `main.ts` заставляет Swagger читать те же схемы.
- Frontend: та же схема идёт в `zodResolver` в react-hook-form.

Значит, при изменении формы данных правится **одна схема** в shared, а не DTO на бэке и типы на фронте по отдельности. Пакет собирается через `tsup` в двух форматах (cjs для Nest, esm для Next) — после правок в shared нужен его пересбор (в `npm run dev` работает `tsup --watch`).

### Денежные суммы

Суммы хранятся как `Decimal(12,2)`, а наружу отдаются **строкой**, потому что `JSON.stringify` от `Prisma.Decimal` теряет точность. За это отвечают:

- `DecimalSerializerInterceptor` (`apps/backend/src/common/interceptors/`) — рекурсивно приводит Decimal к строке в любом ответе;
- `amountSchema` в `common.schema.ts` — принимает строку/число и нормализует (лежит в общей схеме, потому что нужен и транзакциям, и бюджетам);
- утилиты `toCents`/`fromCents`/`sumAmounts` в `packages/shared/src/utils/money.ts` — арифметика идёт в целых копейках.

Не заменять это на `number` в новых полях с деньгами.

### Операции (Transaction)

Центральная модель — `Transaction`, а не отдельные «расходы»: направление задаётся полем `type` (`INCOME | EXPENSE`) с дефолтом `EXPENSE`. Модель `Expense` и модуль `expenses` были переведены в неё миграцией `add-transactions` (`ALTER TABLE ... RENAME`, данные сохранены), поле `note` переименовано в `description`.

- `GET /transactions/summary` требует **обязательные** `month` и `year` — период собирается через `periodOf()` + `monthRange()` из `packages/shared/src/utils/date.ts`, границы считать вручную не нужно.
- Сводка возвращает `income`/`expense`/`net` вместо одного `total`: с двумя типами операций беззнаковая сумма неоднозначна. `net` может быть отрицательным, поэтому типизирован как `z.string()`, а не `amountSchema` (у того есть refinement «> 0»).
- В `byCategory` ключ агрегации — `тип:категория`, а `percentage` считается **внутри своего типа**: общая база при смешении доходов и расходов даёт бессмысленные проценты.
- Удаление категории защищено `CountTransactionsByCategoryQuery` через QueryBus — кросс-модульные вызовы идут только через шину, без инъекции чужих сервисов.

### Аутентификация

- **Access-токен** (15 мин) живёт только в памяти (Zustand `auth-store.ts`), не в localStorage.
- **Refresh-токен** (7 дней) — httpOnly cookie; в БД хранится лишь его SHA-256 (`refresh_tokens.tokenHash`). При каждом `/auth/refresh` старый токен отзывается (ротация).
- Cookie имеет путь `/`, а не `/api/auth`, — иначе `apps/frontend/src/middleware.ts` не увидит её для редиректа гостей на `/login`. Причина зафиксирована в `apps/backend/src/modules/auth/auth.constants.ts`.
- `JwtAuthGuard` подключён глобально через `APP_GUARD`: **все маршруты защищены по умолчанию**, публичные помечаются декоратором `@Public()`.
- Интерсептор в `apps/frontend/src/lib/api-client.ts` ловит 401 и ставит параллельные запросы в одну общую очередь обновления (`refreshPromise`) — иначе каждый из них дёрнул бы `/auth/refresh` и сломал ротацию.

### Скоуп данных по пользователю

Prisma-запросы всегда фильтруются по `userId` из `@CurrentUser('id')`. Категории — особый случай: `userId = null` означает системную категорию, видимую всем и недоступную для редактирования (`CategoriesService.assertOwned`). Перед созданием операции `TransactionsService.create` проверяет принадлежность категории через `CategoriesService.findOne`.

### Конфигурация

- Env валидируется zod-схемой при старте (`apps/backend/src/config/env.schema.ts`) — приложение не поднимется с неполной или слабой конфигурацией (секреты JWT короче 32 символов отклоняются).
- Пресеты tsconfig/ESLint/Prettier лежат в `packages/config` и подключаются через `exports`-пути (`@expense-tracker/config/eslint/nest`). Правила правятся там, а не в отдельных приложениях.

### Сборочные нюансы

- `apps/backend` собирается через `nest build` + **`tsc-alias`**: tsc не переписывает алиасы `@/*`, и без этого шага `node dist/main` не запустится.
- `nest build` использует `tsconfig.build.json` (rootDir `src`), а `tsconfig.json` шире — включает `prisma/` для тайпчека сида.
- `apps/frontend` использует Tailwind CSS v4 (`@import 'tailwindcss'` в `globals.css`, конфиг в CSS через `@theme inline`, без `tailwind.config.js`) и `transpilePackages: ['@expense-tracker/shared']`.
- **`tailwindcss` и `@tailwindcss/postcss` обязаны быть одной версии.** `@tailwindcss/postcss` тянет нативный `@tailwindcss/oxide` по диапазону `^`, и при расхождении сборка CSS падает с `Missing field 'negated' on ScannerOptions.sources`, а страницы отдают 500. Обновлять эту пару только вместе.
- В `packages/config/tsconfig/base.json` **не возвращать `incremental: true`**: с ним генерация `.d.ts` в tsup падает с `TS5074` (флаг требует `tsBuildInfoFile` или вывода в один файл).
