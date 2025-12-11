# Domain Layer

## Mục đích

Domain layer chứa **business logic cốt lõi** của ứng dụng, không phụ thuộc vào bất kỳ layer nào khác.

## Cấu trúc

```
domain/
├── models/          # Domain models/entities
└── repositories/    # Repository interfaces
```

## Models (Entities)

Chứa các domain models với business logic:

- `user.model.ts` - User entity với business rules
- `question.model.ts` - Question entity
- `answer.model.ts` - Answer entity
- ...

**Ví dụ:**

```typescript
// domain/models/user.model.ts
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly role: UserRole
  ) {}

  canCreateQuestion(): boolean {
    return this.role === "STUDENT" || this.role === "ADVISOR";
  }

  canAnswerQuestion(): boolean {
    return this.role === "ADVISOR" || this.role === "ADMIN";
  }
}
```

## Repositories (Interfaces)

Định nghĩa interface để truy cập data, **không implement**:

- `user.repository.ts` - Interface cho User repository
- `question.repository.ts` - Interface cho Question repository
- ...

**Ví dụ:**

```typescript
// domain/repositories/user.repository.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
}
```

## Nguyên tắc

1. ✅ **Không có dependencies**: Không import từ các layer khác
2. ✅ **Pure business logic**: Chỉ chứa logic nghiệp vụ
3. ✅ **Interfaces only**: Repository chỉ là interface, không implement
4. ❌ **Không có framework code**: Không có Next.js, Prisma, etc.
