# Infrastructure Layer

## Mục đích

Infrastructure layer chứa các **implementation** của external concerns: database, config, repositories.

## Cấu trúc

```
infrastructure/
├── config/          # Configuration (env, constants, providers)
├── database/        # Database setup (Prisma)
│   └── prisma/
└── repositories/    # Implement repository interfaces
```

## Config

Chứa configuration và environment setup:

- `env.ts` - Environment variables
- `constants.ts` - App constants
- `providers.ts` - Service providers (JWT, Email, etc.)

**Ví dụ:**

```typescript
// infrastructure/config/env.ts
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  NODE_ENV: process.env.NODE_ENV || "development",
};
```

## Database

Chứa database setup và ORM:

- `prisma/schema.prisma` - Prisma schema
- `prisma/client.ts` - Prisma client instance
- `prisma/index.ts` - Exports

## Repositories

Implement các repository interfaces từ domain:

- `user.repository.prisma.ts` - Implement IUserRepository
- `question.repository.prisma.ts` - Implement IQuestionRepository
- ...

**Ví dụ:**

```typescript
// infrastructure/repositories/user.repository.prisma.ts
import { IUserRepository } from "@/domain/repositories/user.repository";
import { prisma } from "@/infrastructure/database/prisma";
import { User } from "@/domain/models/user.model";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  private toDomain(prismaUser: any): User {
    return new User(
      prismaUser.id,
      prismaUser.email,
      prismaUser.fullName,
      prismaUser.role
    );
  }
}
```

## Nguyên tắc

1. ✅ **Implement interfaces**: Implement các interface từ domain
2. ✅ **External concerns**: Chứa code liên quan đến database, APIs, etc.
3. ✅ **Dependency injection**: Có thể inject vào use cases
4. ❌ **Không có business logic**: Logic nghiệp vụ ở domain/application
