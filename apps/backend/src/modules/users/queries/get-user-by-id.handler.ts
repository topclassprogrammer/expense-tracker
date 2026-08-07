import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { UsersService } from '../users.service';

import { GetUserByIdQuery } from './get-user-by-id.query';

import type { User } from '@expense-tracker/shared';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(private readonly usersService: UsersService) {}

  execute(query: GetUserByIdQuery): Promise<User> {
    return this.usersService.findById(query.userId);
  }
}
