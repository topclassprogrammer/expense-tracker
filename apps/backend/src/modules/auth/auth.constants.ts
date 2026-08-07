/** Имя httpOnly cookie с refresh-токеном. */
export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Путь cookie. Именно '/', а не '/api/auth': middleware фронтенда читает
 * наличие cookie, чтобы редиректить неавторизованных на /login.
 * Cookie не привязана к порту, поэтому в dev она видна и на :3000, и на :3001.
 */
export const REFRESH_COOKIE_PATH = '/';
