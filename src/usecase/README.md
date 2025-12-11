# Usecase Layer

## Mục đích

Usecase layer chứa **use cases** - business logic orchestration và **error handling**.

## Cấu trúc

```
usecase/
├── user/              # User-related use cases
├── question/          # Question-related use cases
├── answer/            # Answer-related use cases
└── errors/            # Custom error classes
```

## Use Cases

Chứa business logic orchestration:

- `user/login.usecase.ts` - Login use case
- `user/register.usecase.ts` - Register use case
- `user/get-profile.usecase.ts` - Get profile use case
- `question/create-question.usecase.ts` - Create question use case
- `question/get-question.usecase.ts` - Get question use case
- `question/search-questions.usecase.ts` - Search questions use case
- `question/update-question.usecase.ts` - Update question use case
- `answer/create-answer.usecase.ts` - Create answer use case
- `answer/update-answer.usecase.ts` - Update answer use case
- `answer/delete-answer.usecase.ts` - Delete answer use case

**Ví dụ:**

```typescript
// usecase/user/login.usecase.ts
import { IUserRepository } from "@/domain/repositories/user.repository";
import { User } from "@/domain/models/user.model";
import { UnauthorizedError } from "@/usecase/errors/app-error";

export class LoginUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !this.validatePassword(password, user.password)) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = this.generateToken(user);
    return { user, token };
  }
}
```

## Errors

Custom error classes:

- `errors/app-error.ts` - Base error classes (ValidationError, NotFoundError, etc.)

**Ví dụ:**

```typescript
// usecase/errors/app-error.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, "NOT_FOUND", 404);
  }
}
```

## Nguyên tắc

1. ✅ **Orchestration**: Orchestrate domain models và repositories
2. ✅ **Dependency injection**: Nhận repositories qua constructor
3. ✅ **No framework code**: Không có Next.js, Prisma code
4. ❌ **Không có UI logic**: UI logic ở presentation layer
