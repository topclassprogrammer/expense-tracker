import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map, type Observable } from 'rxjs';

/**
 * Prisma отдаёт Decimal как объект, а JSON.stringify превращает его
 * в число с потерей точности. Рекурсивно приводим Decimal к строке —
 * фронтенд ожидает `amount: string` (см. expenseSchema в shared).
 */
@Injectable()
export class DecimalSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serialize(data)));
  }
}

function serialize(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) {
    return value.toFixed(2);
  }

  if (value instanceof Date || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serialize(item)]),
  );
}
