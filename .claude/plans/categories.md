# План: категории трат

## Контекст

Запрос — добавить сущность категории (id, name, color, icon, userId), сервис с CRUD, защищённый контроллер с валидацией.

**Проверка кода показала: бэкенд категорий уже полностью реализован.** Существуют:

- модель `Category` в `apps/backend/prisma/schema.prisma` (id, name, icon, color, isDefault, userId, timestamps; `@@unique([userId, name])`, `@@index([userId])`), миграция `20260806083714_init` применена;
- `apps/backend/src/modules/categories/categories.service.ts` — `findAll` / `findOne` / `create` / `update` / `remove` + приватный `assertOwned`;
- `apps/backend/src/modules/categories/categories.controller.ts` — `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `@ApiTags`/`@ApiBearerAuth`, скоуп по `@CurrentUser('id')`;
- защита: `JwtAuthGuard` подключён глобально через `APP_GUARD` в `app.module.ts`, категории **не** помечены `@Public()` — все эндпоинты уже закрыты;
- валидация: `createZodDto` в `dto/category.dto.ts` поверх zod-схем из `packages/shared/src/schemas/category.schema.ts`, глобальный `ZodValidationPipe`.

Про `class-validator`: он числится в `apps/backend/package.json`, но **нигде в коде не используется** — весь проект (auth, expenses, categories) валидируется через zod + `nestjs-zod`, и та же схема переиспользуется фронтом в `zodResolver`. Вводить второй механизм валидации ради одного модуля значит сломать единый контракт, описанный в CLAUDE.md. **Предложение: оставить zod.** Если нужен именно class-validator — это отдельная задача по миграции всего бэкенда, скажите, и я перепланирую.

Таким образом реальная работа — это доводка: смена кода ошибки при удалении (по вашему решению — 409), пара найденных дефектов и UI категорий, который сейчас read-only заглушка.

## Чек-лист задач

### 1. Скопировать план в проект

- [ ] Положить этот файл в `.claude/plans/categories.md` (в plan-режиме запись вне служебного файла запрещена, поэтому делается первым шагом реализации).

### 2. Удаление категории → 409 Conflict

- [ ] `apps/backend/src/modules/categories/categories.service.ts:59` — заменить `BadRequestException` на `ConflictException` (импорт из `@nestjs/common`, `BadRequestException` из импортов убрать). Текст сообщения оставить.
- [ ] `categories.controller.ts` — добавить `@ApiConflictResponse({ description: 'Категория используется в расходах' })` на `remove`, чтобы Swagger отражал реальность.
- [ ] Проверить, что `AllExceptionsFilter` (`apps/backend/src/common/filters/`) пробрасывает статус `HttpException` как есть, а не схлопывает в 400.

### 3. Дубликат имени категории → 409 вместо 500

- [ ] `create`/`update` упираются в `@@unique([userId, name])`; Prisma кидает `P2002`. Проверить обработку в `AllExceptionsFilter`; если её нет — добавить маппинг `PrismaClientKnownRequestError` с `code === 'P2002'` в `ConflictException('Категория с таким названием уже существует')`. Делать в фильтре (общее место), а не в сервисе категорий.

### 4. Дефект `includeDefaults`

- [ ] `packages/shared/src/schemas/category.schema.ts` — `z.coerce.boolean()` превращает строку `"false"` из query-string в `true`, т.е. `GET /categories?includeDefaults=false` не работает. Заменить на разбор строкового литерала:
  ```ts
  includeDefaults: z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .default(true),
  ```
- [ ] После правки — пересборка shared: `npm run build --workspace @expense-tracker/shared`.

### 5. Фронтенд: полноценный CRUD категорий

Хуки уже готовы и переиспользуются как есть — `apps/frontend/src/hooks/use-categories.ts` (`useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, инвалидация через `queryKeys.categories.all()`).

- [ ] `apps/frontend/src/components/ui/dialog.tsx` — обёртка над уже установленным `@radix-ui/react-dialog` в стиле существующих `button.tsx` / `input.tsx`.
- [ ] `apps/frontend/src/components/categories/category-form.tsx` — `react-hook-form` + `zodResolver(createCategorySchema)` (та же схема из shared, что валидирует бэкенд). Поля: название, цвет, иконка.
- [ ] Палитра цветов — из готовой константы `CATEGORY_COLORS` (`packages/shared/src/constants/categories.ts`), не хардкодить.
- [ ] Выбор иконки — набор имён `lucide-react` (взять из `DEFAULT_CATEGORIES` там же); рендер по строке через явную map-таблицу «имя → компонент», без динамического импорта.
- [ ] `apps/frontend/src/app/(dashboard)/categories/page.tsx` — снять `disabled` с кнопки «Добавить категорию», подключить диалог создания, кнопки редактирования/удаления в строке. Для системных категорий (`isDefault === true`) действия скрыть — бэкенд вернёт 403.
- [ ] Ошибку 409 при удалении показывать текстом из ответа через `sonner` (toast уже подключён).

### 6. Мелочи

- [ ] Удалить мёртвые зависимости `class-validator` и `class-transformer` из `apps/backend/package.json` — если решение по п. «Контекст» подтверждено (остаёмся на zod).

## Проверка

Бэкенд (нужен поднятый Postgres: `npm run docker:up`, порт **5433** на этой машине):

```bash
npm run typecheck && npm run lint
npm run dev:backend
```

Через Swagger http://localhost:3001/api/docs (авторизоваться Bearer-токеном из `/auth/login`) или curl:

1. `GET /api/categories` без токена → **401**.
2. `GET /api/categories` → список: 10 системных (`isDefault: true`) + свои.
3. `GET /api/categories?includeDefaults=false` → только свои (регрессия по п. 4).
4. `POST /api/categories` `{"name":"Тест","color":"#ef4444","icon":"flame"}` → **201**.
5. Повторный тот же `POST` → **409** (п. 3).
6. `POST` с `{"color":"red"}` → **400** от zod с сообщением про `#RRGGBB`.
7. `PATCH /api/categories/{id системной}` → **403**.
8. `GET /api/categories/{id чужой категории}` → **404**.
9. `DELETE` пустой категории → **204**; создать расход на категорию, повторить `DELETE` → **409** с текстом про перенос расходов.

Фронтенд: `npm run dev`, зайти на http://localhost:3000/categories — создать категорию, отредактировать цвет и иконку, удалить; убедиться, что список обновляется без перезагрузки и что у системных категорий нет кнопок действий. Затем проверить, что новая категория появилась в фильтре на `/expenses`.
