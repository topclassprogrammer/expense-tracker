import { Module } from '@nestjs/common';

import { CreateUserHandler } from './commands/create-user.handler';
import { FindUserByEmailHandler } from './queries/find-user-by-email.handler';
import { GetUserByIdHandler } from './queries/get-user-by-id.handler';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const HANDLERS = [CreateUserHandler, GetUserByIdHandler, FindUserByEmailHandler];

@Module({
  controllers: [UsersController],
  providers: [UsersService, ...HANDLERS],
  exports: [UsersService],
})
export class UsersModule {}
