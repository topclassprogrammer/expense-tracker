# План: переход на @nestjs/cqrs для взаимодействия между модулями

## Контекст

Модуль пользователей и JWT-авторизация (`auth`, `users`) в проекте уже полностью реализованы и работают end-to-end (регистрация → логин → CRUD расходов → сводка → ротация refresh-токена). При этом модули сейчас связаны через **прямой DI-инжект сервисов друг друга**, что даёт скрытые межмодульные зависимости:

- `AuthController.me()` напрямую инжектит и вызывает `UsersService.findById`, из-за чего `AuthModule` импортирует весь `UsersModule`.
- `AuthService.register/login` работают напрямую через `PrismaService.user.*`, минуя `UsersService` — дублируют зону ответственности users-домена.
- `ExpensesService.create/update` напрямую вызывает `CategoriesService.findOne` для проверки владения категорией, из-за чего `ExpensesModule` импортирует весь `CategoriesModule`.
- `CategoriesService.remove()` напрямую обращается к `prisma.expense.count(...)`, минуя `ExpensesService` — скрытая обратная зависимость categories → expenses через Prisma.
- `UsersService.changePassword()` напрямую отзывает refresh-токены через `prisma.refreshToken.updateMany`, хотя эта операция по смыслу принадлежит auth-домену.

Цель: заменить эти прямые вызовы на взаимодействие через `@nestjs/cqrs` (`CommandBus`/`QueryBus`/`EventBus`), чтобы модули общались через явные Command/Query/Event-контракты, а не через импорт чужих модулей целиком. Это чисто внутренний рефакторинг связей — HTTP-контракты, схемы в `packages/shared`, guards/interceptors/pipes не меняются.

`@nestjs/cqrs` в проекте пока не установлен; `rxjs@7.8.1` уже есть как транзитивная зависимость Nest.

## Матрица "что и куда переезжает"

| Возможность                                                  | Раньше                                                           | Owner теперь                                         | Механизм                                    | Инициатор                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Создать пользователя при регистрации                         | `AuthService.register` → `prisma.user.create`                    | `UsersService.create` (новый метод)                  | `CommandBus` / `CreateUserCommand`          | `AuthService.register`                                                                    |
| Найти пользователя по email (для логина)                     | `AuthService.login` → `prisma.user.findUnique`                   | `UsersService.findByEmailWithPassword` (новый метод) | `QueryBus` / `FindUserByEmailQuery`         | `AuthService.login`                                                                       |
| Получить текущего пользователя (`/auth/me`)                  | `AuthController` → `UsersService.findById`                       | `UsersService.findById` (без изменений)              | `QueryBus` / `GetUserByIdQuery`             | `AuthController.me`                                                                       |
| Проверить владение категорией при создании/изменении расхода | `ExpensesService` → `CategoriesService.findOne`                  | `CategoriesService.findOne` (без изменений)          | `QueryBus` / `FindCategoryByIdQuery`        | `ExpensesService.create/update`                                                           |
| Посчитать расходы по категории перед удалением               | `CategoriesService.remove` → `prisma.expense.count`              | `ExpensesService.countByCategory` (новый метод)      | `QueryBus` / `CountExpensesByCategoryQuery` | `CategoriesService.remove`                                                                |
| Отозвать все сессии при смене пароля                         | `UsersService.changePassword` → `prisma.refreshToken.updateMany` | `AuthService.revokeAllSessions` (новый метод)        | `EventBus` / `UserPasswordChangedEvent`     | публикует `UsersService.changePassword`, обрабатывает `UserPasswordChangedHandler` в auth |

Импорты, которые должны исчезнуть: `AuthModule` → `UsersModule`, `ExpensesModule` → `CategoriesModule`. `AppModule` продолжает импортировать все доменные модули как есть — только добавляется `CqrsModule`.

Handler'ы (Query/Command/Event) — тонкие, делегируют существующим (или новым) методам сервисов, не дублируют бизнес-логику и исключения (`ConflictException`, `NotFoundException`, `ForbiddenException`, `BadRequestException` остаются в сервисе-владельце домена и пробрасываются через bus как есть).

## 1. Установка и подключение

```bash
npm install @nestjs/cqrs --workspace @expense-tracker/backend
```

Перед использованием — проверить `node_modules/@nestjs/cqrs/dist/cqrs.module.js` на `@Global()`:

- Если модуль глобальный — импорта `CqrsModule` в `AppModule` достаточно для доступности `CommandBus`/`QueryBus`/`EventBus` через DI везде; локальные импорты в доменных модулях можно оставить явно для читаемости.
- Если не глобальный — `CqrsModule` нужно импортировать явно и в `AppModule`, и в каждом модуле, где сервис/контроллер инжектит `CommandBus`/`QueryBus`/`EventBus` в конструктор (auth, users, categories, expenses).

Handler-провайдеры (`@CommandHandler`, `@QueryHandler`, `@EventsHandler`) регистрируются в `providers` того модуля, который владеет доменом — Nest обнаруживает их через сканирование всех загруженных модулей приложения независимо от того, где именно они объявлены.

`apps/backend/src/app.module.ts` — добавить `CqrsModule` в `imports` (после `PrismaModule`, перед доменными модулями).

## 2. Новые файлы и изменения по модулям

### `apps/backend/src/modules/users/`

Новые файлы:

- `commands/create-user.command.ts` — `CreateUserCommand { email, name, password }`
- `commands/create-user.handler.ts` — `@CommandHandler(CreateUserCommand)`, делегирует `UsersService.create(dto)`
- `queries/get-user-by-id.query.ts` — `GetUserByIdQuery { userId }`
- `queries/get-user-by-id.handler.ts` — делегирует `UsersService.findById`
- `queries/find-user-by-email.query.ts` — `FindUserByEmailQuery { email }`
- `queries/find-user-by-email.handler.ts` — делегирует `UsersService.findByEmailWithPassword`
- `events/user-password-changed.event.ts` — `UserPasswordChangedEvent { userId }`

Изменения в `users.service.ts`:

- Новый метод `create(dto): Promise<PrismaUser>` — переносит текущую логику `AuthService.register()` (проверка `ConflictException` на дублирующийся email, `argon2.hash`, `prisma.user.create`). Возвращает полный `PrismaUser` (с `passwordHash`), т.к. он нужен `issueTokens()` в auth.
- Новый метод `findByEmailWithPassword(email): Promise<PrismaUser | null>` — `prisma.user.findUnique`, без исключений (возвращает `null`), чтобы `AuthService.login` сохранил текущее поведение с одинаковым сообщением об ошибке для несуществующего email и неверного пароля.
- `findById` — без изменений.
- `changePassword()`: убрать `prisma.refreshToken.updateMany` из `$transaction` (оставить только обновление `passwordHash`). После успешного обновления вызвать `this.eventBus.publish(new UserPasswordChangedEvent(id))`. Конструктор получает `EventBus`.

`users.module.ts`: `imports: [CqrsModule]`, `providers` дополняются тремя handler'ами.

### `apps/backend/src/modules/auth/`

Новый файл:

- `handlers/user-password-changed.handler.ts` — `@EventsHandler(UserPasswordChangedEvent)`, вызывает `AuthService.revokeAllSessions(event.userId)` в try/catch с логированием ошибки (не должен ронять исходный запрос).

Изменения в `auth.service.ts`:

- Конструктор получает `CommandBus`, `QueryBus`.
- `register(dto)`: заменить прямой доступ к Prisma на `const user = await this.commandBus.execute(new CreateUserCommand(dto.email, dto.name, dto.password))`. `ConflictException` пробрасывается из handler'а как есть. Далее — `issueTokens(user)` без изменений.
- `login(dto)`: заменить `prisma.user.findUnique` на `await this.queryBus.execute(new FindUserByEmailQuery(dto.email))`. Остальная логика (`argon2.verify`, `UnauthorizedException`) без изменений.
- Новый метод `revokeAllSessions(userId): Promise<void>` — `prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })` (аналог существующей логики в `logout()`, но по `userId`). `PrismaService` уже инжектирован.
- `refresh()`, `logout()`, `issueTokens()`, `toPublicUser()` — без изменений (это законная зона ответственности auth над таблицей `refreshToken`, CQRS не заменяет ORM-доступ внутри своего домена).

Изменения в `auth.controller.ts`:

- Убрать инжект и импорт `UsersService`.
- Инжектировать `QueryBus`.
- `me()`: `return this.queryBus.execute(new GetUserByIdQuery(user.id))`.

`auth.module.ts`: убрать `UsersModule` из `imports`, добавить `CqrsModule`. `providers` дополняются `UserPasswordChangedHandler`.

### `apps/backend/src/modules/categories/`

Новый файл:

- `queries/find-category-by-id.query.ts` + `find-category-by-id.handler.ts` — `FindCategoryByIdQuery { userId, categoryId }`, делегирует `CategoriesService.findOne(userId, categoryId)`, `NotFoundException` пробрасывается как есть.

Изменения в `categories.service.ts`:

- Конструктор получает `QueryBus`.
- `remove()`: заменить `prisma.expense.count(...)` на `await this.queryBus.execute(new CountExpensesByCategoryQuery(id))`.
- `findOne`, `assertOwned`, остальные методы и исключения — без изменений.

`categories.module.ts`: `imports: [CqrsModule]`, `providers` дополняются `FindCategoryByIdHandler`.

### `apps/backend/src/modules/expenses/`

Новый файл:

- `queries/count-expenses-by-category.query.ts` + `count-expenses-by-category.handler.ts` — `CountExpensesByCategoryQuery { categoryId }`, делегирует `ExpensesService.countByCategory(categoryId)`.

Изменения в `expenses.service.ts`:

- Убрать инжект `CategoriesService`, добавить `QueryBus`.
- `create()`/`update()`: заменить `categoriesService.findOne(userId, dto.categoryId)` на `await this.queryBus.execute(new FindCategoryByIdQuery(userId, dto.categoryId))`.
- Новый метод `countByCategory(categoryId): Promise<number>` — `prisma.expense.count({ where: { categoryId } })`.
- `findAll`, `findOne`, `remove`, `summary`, `buildWhere` — без изменений.

`expenses.module.ts`: убрать `CategoriesModule` из `imports`, добавить `CqrsModule`. `providers` дополняются `CountExpensesByCategoryHandler`.

## 3. Порядок внедрения

1. Установить `@nestjs/cqrs`, проверить `@Global()`, добавить `CqrsModule` в `AppModule`.
2. **users**: добавить Command/Query/Event инфраструктуру, новые методы `UsersService.create`/`findByEmailWithPassword`, обновить `changePassword` (публикация события, убрать прямой `refreshToken.updateMany`). Обновить `users.module.ts`.
3. **auth**: добавить `UserPasswordChangedHandler` + `AuthService.revokeAllSessions`; переключить `register/login` на `CommandBus`/`QueryBus`; переключить `AuthController.me` на `QueryBus`; убрать `UsersService` из контроллера; убрать `UsersModule` из `auth.module.ts`, добавить `CqrsModule`.
4. **categories → expenses**: добавить `CountExpensesByCategoryQuery`/handler в expenses, `ExpensesService.countByCategory`; переключить `CategoriesService.remove` на `QueryBus`; добавить `CqrsModule` в `categories.module.ts`.
5. **expenses → categories**: добавить `FindCategoryByIdQuery`/handler в categories; переключить `ExpensesService.create/update` на `QueryBus`; убрать `CategoriesService` из `ExpensesService`; убрать `CategoriesModule` из `expenses.module.ts`, добавить `CqrsModule`.
6. После каждого шага 2–5 — `npm run typecheck` и `npm run lint` из корня, не откладывать на конец.
7. Финальная проверка через `grep`: `auth.module.ts` не содержит `UsersModule`, `expenses.module.ts` не содержит `CategoriesModule`, `CategoriesService`/`UsersService` не инжектятся напрямую за пределами своего домена (кроме собственных контроллеров).

Не стоит держать старый и новый пути связи одновременно за фичефлагом — проект небольшой, миграция по одному домену за проход (шаги 2–5) безопаснее и понятнее в диффе.

## 4. Особое внимание: `UserPasswordChangedEvent` и порядок выполнения

`changePassword()` сейчас делает `prisma.$transaction([...])` с обновлением пароля и отзывом токенов одним махом. После рефакторинга транзакция обновляет только `passwordHash`, а `eventBus.publish(new UserPasswordChangedEvent(id))` вызывается после успешного завершения транзакции. Обработчик в auth-модуле должен быть обёрнут в try/catch с логированием — исключение в обработчике события не должно ронять ответ на смену пароля.

Нужно эмпирически проверить (на этапе реализации, логированием до/после), выполняется ли `EventBus.publish` в используемой версии `@nestjs/cqrs` синхронно в том же тике до возврата HTTP-ответа. Если гарантия "все сессии отозваны к моменту ответа" не выполняется стабильно — заменить `EventBus` на `CommandBus` с `await commandBus.execute(new RevokeAllSessionsCommand(userId))` для этого конкретного перехода (менее "чисто CQRS", но даёт строгий порядок).

## 5. Тестирование (сквозной ручной/curl-сценарий — юнит-тестов в проекте пока нет)

1. `POST /auth/register` (новый email) → 201, `AuthResponse`, refresh-cookie.
2. Повторный `POST /auth/register` тем же email → 409 (проверка `CreateUserCommand` → `ConflictException`).
3. `POST /auth/login` верно/неверно → 200 / 401 с одинаковым сообщением для несуществующего email и неверного пароля (`FindUserByEmailQuery` → `null`).
4. `GET /auth/me` → 200, публичный `User` без `passwordHash` (`GetUserByIdQuery`).
5. `POST /categories` → создать категорию; `POST /expenses` с её `categoryId` → 201 (`FindCategoryByIdQuery`).
6. `POST /expenses` с чужим/несуществующим `categoryId` → 404 "Категория не найдена".
7. `PATCH /expenses/:id` со сменой `categoryId` → 200.
8. `GET /expenses/summary` → корректная агрегация (не тронуто, но проверить отсутствие регресса).
9. `DELETE /categories/:id` без расходов → успех (`CountExpensesByCategoryQuery` = 0).
10. `DELETE /categories/:id` с расходами → 400 с сообщением о количестве расходов.
11. `POST /auth/refresh` → 200, новая пара токенов, старый refresh помечен `revokedAt`.
12. Смена пароля (`users.controller.ts`, актуальный путь — сверить) → 200; сразу после — `POST /auth/refresh` со **старым** refresh-токеном → 401 (подтверждает, что `UserPasswordChangedEvent` долетел до `AuthService.revokeAllSessions` до того, как токен мог быть использован).
13. `POST /auth/logout` → 204, cookie очищена, refresh-токен отозван.

## 6. Что НЕ меняется

- Схемы `packages/shared` (zod, DTO, `AuthResponse`, `User`, `ExpenseSummary`) — не трогать.
- HTTP-контракты: пути, методы, статусы, форматы тел ответов, cookie-механика (`REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_PATH`) — идентичны текущим.
- Guards (`JwtAuthGuard`, `JwtRefreshGuard`, `ThrottlerGuard`), `DecimalSerializerInterceptor`, `AllExceptionsFilter`, `ZodValidationPipe` — без изменений.
- `PrismaService` остаётся единственным слоем доступа к БД внутри сервиса-владельца домена (например, `AuthService` по-прежнему напрямую работает с `prisma.refreshToken.*` — это его домен, CQRS вводится только для _межмодульных_ вызовов).
- `argon2`, JWT-стратегии, логика выдачи токенов (`issueTokens`) — без изменений.
- Saga (`@Saga()`) не нужна — сценариев "событие → публикация нового Command" в требованиях нет.

## Затрагиваемые файлы

- `apps/backend/package.json`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/modules/auth/{auth.service.ts, auth.controller.ts, auth.module.ts}` + новый `handlers/user-password-changed.handler.ts`
- `apps/backend/src/modules/users/{users.service.ts, users.module.ts}` + новые `commands/`, `queries/`, `events/`
- `apps/backend/src/modules/categories/{categories.service.ts, categories.module.ts}` + новый `queries/find-category-by-id.*`
- `apps/backend/src/modules/expenses/{expenses.service.ts, expenses.module.ts}` + новый `queries/count-expenses-by-category.*`
