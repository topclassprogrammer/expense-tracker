import { Logger } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { UserPasswordChangedEvent } from '../../users/events/user-password-changed.event';
import { AuthService } from '../auth.service';

@EventsHandler(UserPasswordChangedEvent)
export class UserPasswordChangedHandler implements IEventHandler<UserPasswordChangedEvent> {
  private readonly logger = new Logger(UserPasswordChangedHandler.name);

  constructor(private readonly authService: AuthService) {}

  async handle(event: UserPasswordChangedEvent): Promise<void> {
    try {
      await this.authService.revokeAllSessions(event.userId);
    } catch (error) {
      // Ошибка обработчика события не должна ронять исходный HTTP-запрос смены пароля.
      this.logger.error(`Не удалось отозвать сессии пользователя ${event.userId}`, error);
    }
  }
}
