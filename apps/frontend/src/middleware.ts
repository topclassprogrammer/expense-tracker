import { NextResponse, type NextRequest } from 'next/server';

const REFRESH_COOKIE_NAME = 'refresh_token';
const AUTH_ROUTES = ['/login', '/register'];
// Соглашение и политика обработки данных доступны и гостю, и авторизованному пользователю.
const PUBLIC_ROUTES = [...AUTH_ROUTES, '/terms', '/privacy'];

/**
 * Грубая проверка сессии по наличию refresh-cookie: сам токен валидирует
 * backend, здесь важно лишь не показывать дашборд заведомо гостю.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(REFRESH_COOKIE_NAME);
  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!hasSession && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
