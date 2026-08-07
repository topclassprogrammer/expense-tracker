# Expense Tracker

Монорепозиторий трекера личных расходов: категории, операции, бюджеты и аналитика.

## Стек

| Слой             | Технологии                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Монорепо         | npm workspaces + Turborepo, TypeScript 5 (strict), Node 22        |
| Backend          | Nest.js 11, REST + Swagger, Prisma 6, PostgreSQL 17, Passport JWT |
| Frontend         | Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui     |
| Данные на фронте | TanStack Query v5, Zustand, react-hook-form + zod, axios          |
| Инфраструктура   | Docker Compose (Postgres), ESLint 9 flat config, Prettier         |

## Структура

```
expense-tracker/
├─ apps/
│  ├─ backend/        # Nest.js: REST API, Prisma, JWT-аутентификация
│  └─ frontend/       # Next.js: интерфейс приложения
├─ packages/
│  ├─ shared/         # zod-схемы, типы DTO, константы и утилиты (общие)
│  └─ config/         # пресеты tsconfig, ESLint и Prettier
├─ docker-compose.yml # PostgreSQL
└─ turbo.json         # оркестрация задач
```

Единый источник правды для контрактов API — `packages/shared`: те же zod-схемы
валидируют тело запроса в Nest (через `nestjs-zod`) и формы на фронтенде
(через `@hookform/resolvers/zod`).

## Быстрый старт

```bash
# 1. Зависимости (npm 10+, идёт вместе с Node 22)
npm install

# 2. Переменные окружения
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# 3. База данных
npm run docker:up
npm run db:migrate      # создаст первую миграцию
npm run db:seed         # системные категории

# 4. Запуск
npm run dev
```

| Сервис   | Адрес                            |
| -------- | -------------------------------- |
| Frontend | http://localhost:3000            |
| API      | http://localhost:3001/api        |
| Swagger  | http://localhost:3001/api/docs   |
| Health   | http://localhost:3001/api/health |

Перед первым запуском замените `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` —
приложение не стартует, если секрет короче 32 символов.
Сгенерировать: `openssl rand -base64 48`.

## Команды

| Команда                  | Действие                                      |
| ------------------------ | --------------------------------------------- |
| `npm run dev`            | Запуск frontend и backend в режиме разработки |
| `npm run dev:backend`    | Только backend                                |
| `npm run dev:frontend`   | Только frontend                               |
| `npm run build`          | Сборка всех пакетов                           |
| `npm run lint`           | ESLint по всему монорепозиторию               |
| `npm run typecheck`      | Проверка типов                                |
| `npm run format`         | Форматирование Prettier                       |
| `npm run db:migrate`     | Создание и применение миграции (dev)          |
| `npm run db:studio`      | Prisma Studio                                 |
| `npm run db:seed`        | Сид системных категорий                       |
| `npm run db:reset`       | Сброс БД и повторное применение миграций      |
| `npm run docker:up/down` | Управление контейнером PostgreSQL             |

Для одного пакета: `npm run <script> --workspace @expense-tracker/backend`
или `turbo run <task> --filter=@expense-tracker/frontend`.

## Аутентификация

- **access-токен** (15 мин) — в памяти клиента (Zustand), уходит в заголовке `Authorization`.
- **refresh-токен** (7 дней) — в httpOnly cookie; в БД хранится только его SHA-256.
- При каждом `/auth/refresh` происходит ротация: старый токен отзывается.
- Интерсептор axios ловит 401, обновляет пару и повторяет запрос; параллельные
  запросы ждут одного общего обновления.
- Смена пароля отзывает все активные сессии пользователя.

## Модель данных

`User` → `RefreshToken`, `Category`, `Transaction`, `Budget`.
`Transaction` — центральная модель учёта: направление операции задаётся полем
`type` (`INCOME | EXPENSE`).
Суммы хранятся как `Decimal(12,2)` и отдаются наружу строкой — интерсептор
`DecimalSerializerInterceptor` предотвращает потерю точности при сериализации в JSON.

## Что дальше

Каркас готов, бизнес-логика UI наполняется на следующем этапе:
формы создания операции и категории, графики (recharts), бюджеты,
экспорт, тесты и CI.
