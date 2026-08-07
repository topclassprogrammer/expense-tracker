import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

import { REFRESH_COOKIE_NAME } from '../auth.constants';

import type { JwtPayload } from '@expense-tracker/shared';
import type { Request } from 'express';

export interface RefreshRequestUser {
  id: string;
  email: string;
  /** Сырой refresh-токен нужен сервису для сверки хеша и ротации. */
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(request: Request, payload: JwtPayload): RefreshRequestUser {
    const refreshToken = extractFromCookie(request);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh-токен отсутствует');
    }

    return { id: payload.sub, email: payload.email, refreshToken };
  }
}

function extractFromCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, string> | undefined;
  return cookies?.[REFRESH_COOKIE_NAME] ?? null;
}
