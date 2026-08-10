## Project Overview

Frontend трекера расходов на Next.js. Готовы `/login`, `/register`, `/categories` и главный экран `/`: сводка за месяц, фильтры (период / тип / категория), список операций с пагинацией по 10, диалоги создания/редактирования/удаления операции, дропдаун профиля в шапке. Отдельной страницы `/expenses` больше нет — работа с операциями целиком на главном экране.

Не сделаны: форма профиля и смены пароля на `/settings` (остался `TODO`), графики (`recharts` в зависимостях, но нигде не импортируется; готовая серия для тренда — `summary.byDay`).

## Tech Stack

- Next.js 15 (App Router, Turbopack), React 19.
- Tailwind CSS v4, Radix UI, `lucide-react`, `tw-animate-css`.
- `react-hook-form` + `@hookform/resolvers` — формы на тех же zod-схемах, что и бэкенд.
- `@tanstack/react-query` — серверное состояние и кэш.
- `zustand` — `auth-store.ts` для access-токена в памяти.
- `axios` — HTTP-клиент (`src/lib/api-client.ts`).
- `date-fns`, `sonner` (тосты), `class-variance-authority` + `tailwind-merge` (варианты компонентов).
- `recharts` — в зависимостях, пока не используется.

## Commands

Запускать можно из корня монорепо или напрямую в этом workspace.

```bash
npm run dev:frontend --workspace @expense-tracker/frontend   # next dev --turbopack (:3000)
npm run build --workspace @expense-tracker/frontend
npm run start --workspace @expense-tracker/frontend
npm run lint --workspace @expense-tracker/frontend
npm run typecheck --workspace @expense-tracker/frontend
```

**Перед запуском/сборкой `packages/shared` должен быть собран** (`npm run build --workspace @expense-tracker/shared`) — иначе `TS2307` при импорте общих схем/утилит.

Тесты не настроены.

## File Structure

```
src/
├── app/                                  # Next.js App Router — страницы и layout'ы
│   ├── (auth)/
│   │   ├── layout.tsx                    # Общий layout для гостевых страниц
│   │   ├── login/page.tsx                # /login
│   │   └── register/page.tsx             # /register
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Layout с sidebar + header для авторизованных страниц
│   │   ├── page.tsx                      # / — сводка, фильтры, список операций
│   │   ├── categories/page.tsx           # /categories
│   │   └── settings/page.tsx             # /settings (форма профиля и пароля — TODO)
│   ├── privacy/page.tsx                  # /privacy — статическая страница
│   ├── terms/page.tsx                    # /terms — статическая страница
│   ├── layout.tsx                        # Корневой layout — провайдеры, шрифты, globals.css
│   └── globals.css                       # Tailwind v4 (@import, @theme inline)
├── components/
│   ├── auth-bootstrap.tsx                # Восстанавливает сессию из refresh-cookie при загрузке приложения
│   ├── providers.tsx                     # QueryClientProvider и прочие глобальные провайдеры
│   ├── categories/
│   │   ├── category-dialog.tsx           # Диалог создания/редактирования категории
│   │   └── category-icon.tsx             # Таблица «имя иконки из БД → компонент lucide-react»
│   ├── layout/
│   │   ├── header.tsx                    # Шапка дашборда
│   │   ├── sidebar.tsx                   # Навигация (/, /categories, /settings)
│   │   └── user-menu.tsx                 # Дропдаун профиля — имя, email, выход
│   ├── transactions/
│   │   ├── transaction-dialog.tsx        # Диалог создания/редактирования операции
│   │   ├── transaction-delete-dialog.tsx # Диалог подтверждения удаления
│   │   ├── transaction-filters.tsx       # Фильтры списка (период / тип / категория)
│   │   ├── transaction-list.tsx          # Список операций
│   │   └── transaction-pagination.tsx    # Пагинация списка (по 10)
│   └── ui/                               # shadcn/ui-компоненты: button, card, checkbox, dialog,
│                                          # dropdown-menu, input, label, select, skeleton, sonner
├── hooks/
│   ├── use-auth.ts                       # React Query хуки: login/register/logout, useCurrentUser
│   ├── use-categories.ts                 # React Query хуки CRUD категорий
│   └── use-transactions.ts               # React Query хуки CRUD операций + сводка
├── lib/
│   ├── api-client.ts                     # axios-инстанс, интерсептор 401 + очередь refresh (refreshPromise)
│   ├── api-error.ts                      # Достаёт человекочитаемое сообщение об ошибке из ответа API
│   ├── query-keys.ts                     # Единая фабрика ключей кэша TanStack Query
│   └── utils.ts                          # cn() — clsx + tailwind-merge
├── store/
│   ├── auth-store.ts                     # Zustand — access-токен и текущий пользователь в памяти
│   └── ui-store.ts                       # Zustand — состояние сайдбара (открыт/закрыт)
└── middleware.ts                         # Редирект гостей на /login по наличию refresh-cookie
```
