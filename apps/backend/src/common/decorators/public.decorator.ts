import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Помечает маршрут как доступный без access-токена. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
