import { isAxiosError } from 'axios';

/** Формат тела ошибки из AllExceptionsFilter на бэкенде. */
interface ApiErrorBody {
  message?: string | string[];
}

/** Достаёт человекочитаемое сообщение из ответа API, иначе возвращает запасное. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return fallback;
  }

  const { message } = error.response?.data ?? {};

  if (Array.isArray(message)) {
    return message.join(', ') || fallback;
  }

  return message ?? fallback;
}
