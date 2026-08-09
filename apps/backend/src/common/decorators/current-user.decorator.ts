import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { Request } from 'express';

/** Пользователь, положенный в request JWT-стратегией. */
export interface RequestUser {
  id: string;
  email: string;
}

/**
 * Параметр-декоратор: достаёт текущего пользователя из `request.user`,
 * положенного туда JWT-стратегией после прохождения `JwtAuthGuard`.
 * `@CurrentUser()` — весь пользователь, `@CurrentUser('id')` — одно поле.
 *
 * @param data - имя поля `RequestUser` для выборки, либо `undefined` для всего объекта.
 * @param ctx - контекст выполнения Nest, из которого достаётся HTTP-запрос.
 * @returns Значение запрошенного поля, весь объект пользователя, либо `undefined`,
 * если маршрут публичный и `request.user` не заполнен.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: RequestUser }>();
    return data ? request.user?.[data] : request.user;
  },
);
