import { changePasswordSchema, updateUserSchema } from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateUserDto extends createZodDto(updateUserSchema) {}

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
