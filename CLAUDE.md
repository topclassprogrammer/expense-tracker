## Project Overview

Монорепозиторий трекера расходов: учёт операций (доходы/расходы) по категориям с месячной сводкой и аутентификацией по JWT.

## Tech Stack

- **Монорепозиторий:** npm workspaces (`apps/*`, `packages/*`), сборка/оркестрация — Turborepo.
- **Backend** (`apps/backend`): NestJS 11, Prisma 6 / PostgreSQL, `nestjs-zod` для DTO, `@nestjs/cqrs` для кросс-модульных запросов, `passport-jwt` + `@nestjs/jwt` для аутентификации, `argon2` для хэширования паролей, Swagger (`@nestjs/swagger`).
- **Frontend** (`apps/frontend`): Next.js 15 (App Router, Turbopack), React 19, Tailwind CSS v4, Radix UI, `react-hook-form` + `@hookform/resolvers`, `@tanstack/react-query`, `zustand` (auth store), `axios`, `recharts` (в зависимостях, пока не используется).
- **packages/shared**: общие zod-схемы и утилиты (деньги, даты), собирается через `tsup` (cjs + esm).
- **packages/config**: общие пресеты tsconfig/ESLint/Prettier.
- **Валидация:** Zod — единый источник правды для DTO бэка и форм фронта.
- **Инфраструктура:** Docker Compose (PostgreSQL), Prisma Migrate.

## Commands

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

Swagger: http://localhost:3001/api/docs. Health: `/api/health`.

## Architecture

Четыре workspace-пакета: `apps/backend`, `apps/frontend`, `packages/shared`, `packages/config`.

## Коммиты

Правила оформления и создания коммитов — в skill `commit-to-branch` (`.claude/skills/commit-to-branch/SKILL.md`).

## Обновление docs
При добавлении функционала, проверяй документацию в @.claude/docs/* и актуализируй




