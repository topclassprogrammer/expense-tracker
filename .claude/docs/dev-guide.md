# Гайд для разработчиков

## Требования

- Node.js ≥ 22, npm ≥ 10 (`engines` в корневом `package.json`).
- Docker (для локального PostgreSQL через `docker-compose.yml`).

## Первый запуск

```bash
git clone <repo>
cd expense-tracker
npm install                       # ставит зависимости всех workspace сразу

cp .env.example .env               # корневой .env — переменные для docker-compose
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

npm run docker:up                  # поднимает PostgreSQL (порт 5432)
npm run build --workspace @expense-tracker/shared   # обязательно перед первым migrate/seed/typecheck
npm run db:migrate                 # prisma migrate dev — создаёт таблицы
npm run db:seed                    # 10 системных категорий

npm run dev                        # frontend :3000 + backend :3001 одновременно
```

**Секреты JWT** (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` в `apps/backend/.env`) должны быть ≥ 32 символов — сгенерировать: `openssl rand -base64 48`. Без них приложение не стартует (`env.schema.ts` валидирует `.env` при бутстрапе).

Swagger: http://localhost:3001/api/docs. Health: http://localhost:3001/api/health.

## Порядок сборки в монорепо

`packages/shared` — обычная npm-зависимость для `apps/backend` и `apps/frontend` (собирается `tsup` в `cjs` + `esm`), поэтому:

- `npm run dev` / `npm run build` / `npm run typecheck` из **корня** — Turborepo сам выстраивает порядок и пересобирает `shared` при необходимости.
- Если вызывать скрипты **напрямую** в `apps/backend` или `apps/frontend` (`npm run db:seed --workspace ...`, `npm run typecheck --workspace ...`), минуя Turborepo, — `packages/shared` нужно собрать вручную первым: `npm run build --workspace @expense-tracker/shared`. Иначе — ошибка `TS2307: Cannot find module '@expense-tracker/shared'`.

## Частые команды

```bash
npm run dev            # frontend + backend
npm run dev:backend    # только backend (:3001)
npm run dev:frontend   # только frontend (:3000)
npm run build           # сборка всех пакетов
npm run lint            # ESLint по всему монорепо
npm run typecheck       # tsc --noEmit по всем пакетам
npm run format           # Prettier

npm run docker:up        # PostgreSQL
npm run docker:down
npm run docker:logs
npm run db:migrate        # новая миграция в разработке
npm run db:deploy         # применить существующие миграции (CI/прод)
npm run db:studio         # GUI Prisma Studio
npm run db:seed           # системные категории (idempotent)
npm run db:reset          # сброс БД + повторные миграции
```

Тесты в проекте **не настроены** — ни на бэкенде (`apps/backend/test/` заготовка), ни на фронтенде. Корректность проверяется `typecheck` + `lint` + ручным сквозным сценарием.

## Где что искать

| Хочу... | Смотреть в |
|---|---|
| Добавить/изменить бизнес-правило валидации (сумма, email, пароль, диапазон дат) | `packages/shared/src/schemas/*.schema.ts` — правится один раз, действует и на бэке (DTO), и на фронте (форма) |
| Добавить эндпоинт | `apps/backend/src/modules/<module>/*.controller.ts` + `*.service.ts`; если нужен доступ к данным другого модуля — CQRS query/command, не прямой импорт сервиса |
| Добавить поле в БД | `apps/backend/prisma/schema.prisma` → `npm run db:migrate` → обновить соответствующую zod-схему в `shared` |
| Добавить страницу/компонент фронта | `apps/frontend/src/app/(dashboard)/...` (защищённые) или `(auth)/...` (гостевые); обращение к API — только через хук в `hooks/*`, не напрямую через `apiClient` в компоненте |
| Изменить список валют/системных категорий | `packages/shared/src/constants/currencies.ts` / `categories.ts` |
| Разобраться в потоке аутентификации | `architecture.md` → раздел «Аутентификация»; код: `apps/backend/src/modules/auth/`, `apps/frontend/src/lib/api-client.ts`, `apps/frontend/src/middleware.ts` |

Подробная карта файлов backend/frontend — в `apps/backend/CLAUDE.md` и `apps/frontend/CLAUDE.md` (секция «File Structure»).

## Конвенции коммитов

Формат — Conventional Commits: `<type>: <краткое описание>` (при необходимости `<type>(scope): ...`).

- Заголовок на английском, императив, без точки в конце.
- Типы: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
- Тело коммита (если есть) объясняет **почему**, а не пересказывает дифф.
- Коммитить только по явной просьбе — не создавать коммиты проактивно после каждой правки.

## Чек-лист перед PR (см. также `REVIEW.md`)

Полные критерии code review — в `REVIEW.md` в корне репозитория (используется `/code-review`). Коротко, специфика стека:

**Backend**
- DTO — только через `nestjs-zod` (`createZodDto`) из схем `shared`, не ручные `class-validator`.
- Кросс-модульный доступ к данным — через `@nestjs/cqrs`, не прямой импорт `Service` другого модуля.
- Новые публичные маршруты обязаны быть явно помечены `@Public()` — по умолчанию всё защищено `JwtAuthGuard`.
- Суммы (`Prisma.Decimal`) в ответах — проходят через `DecimalSerializerInterceptor`, вручную не сериализовать.
- Пароли — только `argon2`.
- Изменение `env.schema.ts` — синхронно с `.env.example` во всех местах (`/.env.example`, `apps/backend/.env.example`).

**Frontend**
- Формы — теми же zod-схемами, что и бэкенд DTO (`react-hook-form` + `@hookform/resolvers`).
- Серверное состояние — только через `@tanstack/react-query` с ключами из `lib/query-keys.ts`.
- Access-токен — только в памяти (`zustand`), никогда в `localStorage`/`sessionStorage`.
- Обработка `401`/обновление токена — через существующий `refreshPromise` в `lib/api-client.ts`, не дублировать в отдельных хуках.

**После изменения методов backend** (правило из `apps/backend/CLAUDE.md`): актуализировать JSDoc, для DTO/контроллеров — добавить/обновить декораторы Swagger (`@ApiOperation`, `@ApiOkResponse` и т.д.).

## Актуализация документации

Эти четыре файла (`architecture.md`, `api.md`, `database.md`, `dev-guide.md`) описывают состояние на момент их написания. При структурных изменениях (новый модуль, новая таблица, смена схемы аутентификации) стоит обновить соответствующий документ в том же PR.
