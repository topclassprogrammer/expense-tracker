import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { UsersService } from '../users.service';

import { CreateUserCommand } from './create-user.command';

import type { User as PrismaUser } from '@prisma/client';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly usersService: UsersService) {}

  execute(command: CreateUserCommand): Promise<PrismaUser> {
    return this.usersService.create(command);
  }
}
