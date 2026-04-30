// Input:  NestJS module with provider registration
// Output: Auto-wired UserService with injected dependencies

import { Module, Injectable, Inject } from '@nestjs/common';

interface UserRepository {
  findById(id: string): Promise<User | null>;
}

@Injectable()
class PgUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    // database lookup
    return { id, name: 'Alice' };
  }
}

@Injectable()
class UserService {
  constructor(
    @Inject('USER_REPO') private readonly repo: UserRepository,
  ) {}
}

@Module({
  providers: [
    { provide: 'USER_REPO', useClass: PgUserRepository },
    UserService,
  ],
  exports: [UserService],
})
export class UserModule {}
