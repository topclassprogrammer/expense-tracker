import { loginSchema, registerSchema } from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO наследуют zod-схемы из shared: одна и та же валидация
 * на бэкенде и во фронтовых формах, Swagger строит схему автоматически.
 */
export class RegisterDto extends createZodDto(registerSchema) {}

export class LoginDto extends createZodDto(loginSchema) {}
