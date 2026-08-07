import { Module } from '@nestjs/common';

import { CreateUserHandler } from './commands/create-user.handler';
import { FindUserByEmailHandler } from './queries/find-user-by-email.handler';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const HANDLERS = [CreateUserHandler, FindUserByEmailHandler];

@Module({
  controllers: [UsersController],
  providers: [UsersService, ...HANDLERS],
  exports: [UsersService],
})
export class UsersModule {}
