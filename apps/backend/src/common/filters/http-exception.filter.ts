import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { Request, Response } from 'express';

import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '@/modules/auth/auth.constants';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  path: string;
  timestamp: string;
}

/** Приводит любое исключение к единому формату ответа. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url}`, (exception as Error)?.stack);
    }

    // Если refresh-токен отклонён (просрочен/отозван/не найден), cookie нужно
    // снять — иначе middleware фронтенда видит её и вечно редиректит гостя
    // с /login обратно на защищённые страницы, а те снова получают 401.
    if (status === HttpStatus.UNAUTHORIZED && request.path.endsWith('/auth/refresh')) {
      response.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    }

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    message: string | string[];
    error?: string;
  } {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ?? exception.message);

      return { status: exception.getStatus(), message, error: exception.name };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrisma(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Внутренняя ошибка сервера',
      error: 'InternalServerError',
    };
  }

  private resolvePrisma(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Запись с такими данными уже существует',
          error: 'UniqueConstraintViolation',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Запись не найдена',
          error: 'NotFound',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Нарушена ссылочная целостность',
          error: 'ForeignKeyViolation',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка базы данных',
          error: 'DatabaseError',
        };
    }
  }
}
