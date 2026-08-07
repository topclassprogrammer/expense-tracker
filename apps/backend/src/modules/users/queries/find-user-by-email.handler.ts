import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { UsersService } from '../users.service';

import { FindUserByEmailQuery } from './find-user-by-email.query';

import type { User as PrismaUser } from '@prisma/client';

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<FindUserByEmailQuery> {
  constructor(private readonly usersService: UsersService) {}

  execute(query: FindUserByEmailQuery): Promise<PrismaUser | null> {
    return this.usersService.findByEmailWithPassword(query.email);
  }
}
