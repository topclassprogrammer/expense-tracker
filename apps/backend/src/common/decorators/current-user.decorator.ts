import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { Request } from 'express';

/** Пользователь, положенный в request JWT-стратегией. */
export interface RequestUser {
  id: string;
  email: string;
}

/**
 * `@CurrentUser()` — весь пользователь, `@CurrentUser('id')` — одно поле.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: RequestUser }>();
    return data ? request.user?.[data] : request.user;
  },
);
