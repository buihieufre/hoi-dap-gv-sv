# Clean Architecture - Cấu trúc Dự án

## Tổng quan

Dự án được tổ chức theo **Clean Architecture** với 4 layer chính: Domain, Usecase, Infrastructure, Presentation.

## Cấu trúc Thư mục

```
src/
├── app/                         # Next.js App Router (UI layer)
│   ├── (public-pages)/          # Pages không cần bảo vệ (Login, Register, Home)
│   ├── (protected)/             # Pages cần auth (Dashboard, Questions, Profile)
│   └── api/                     # Route handlers gọi vào Usecase layer
│
├── domain/                      # Core Domain - Business Logic
│   ├── models/                  # Domain models/entities (User, Question, Answer...)
│   └── repositories/            # Repository interfaces
│
├── usecase/                     # Use Cases - Business Logic Orchestration
│   ├── user/                    # User-related use cases
│   ├── question/                # Question-related use cases
│   ├── answer/                  # Answer-related use cases
│   └── errors/                  # Custom error classes
│
├── infrastructure/              # External Concerns
│   ├── config/                  # Configuration (env, constants, providers)
│   ├── database/                # Database setup (Prisma)
│   │   └── prisma/
│   └── repositories/            # Implement repository interfaces
│
├── presentation/                # UI Layer
│   ├── components/              # React components
│   └── hooks/                   # Custom React hooks
│
├── shared/                      # Shared Utilities
│   ├── utils/                   # Helper functions
│   ├── constants/               # Constants, enums
│   └── types/                   # Common TypeScript types
│
└── tests/                       # Tests
    ├── unit/                    # Unit tests
    ├── integration/             # Integration tests
    └── e2e/                     # E2E tests
```

## Dependency Rule

**Luồng phụ thuộc:** `app` → `presentation` → `usecase` → `domain` ← `infrastructure`

- **Domain**: Không phụ thuộc vào bất kỳ layer nào
- **Usecase**: Chỉ phụ thuộc vào Domain
- **Infrastructure**: Phụ thuộc vào Domain (implement repository interfaces)
- **Presentation**: Phụ thuộc vào Usecase
- **App**: Phụ thuộc vào Presentation và Usecase (API routes)

## Path Aliases

Đã cấu hình trong `tsconfig.json`:

- `@/domain/*` → `src/domain/*`
- `@/usecase/*` → `src/usecase/*`
- `@/infrastructure/*` → `src/infrastructure/*`
- `@/presentation/*` → `src/presentation/*`
- `@/shared/*` → `src/shared/*`
- `@/*` → `src/*`

## Ví dụ Flow

### 1. User đăng nhập

```
app/api/auth/login/route.ts
  → usecase/user/login.usecase.ts
  → domain/repositories/user.repository.ts (interface)
  → infrastructure/repositories/user.repository.prisma.ts (implementation)
  → infrastructure/database/prisma/client.ts
```

### 2. Tạo câu hỏi

```
app/(protected)/questions/new/page.tsx
  → presentation/components/QuestionForm.tsx
  → presentation/hooks/use-create-question.ts
  → usecase/question/create-question.usecase.ts
  → domain/models/question.model.ts
  → domain/repositories/question.repository.ts (interface)
  → infrastructure/repositories/question.repository.prisma.ts (implementation)
```

## Layer Responsibilities

### Domain Layer

- **Models**: Domain entities với business logic thuần túy
- **Repositories**: Interface định nghĩa cách truy cập data (không implement)

### Usecase Layer

- **Use Cases**: Business logic orchestration, gọi domain models và repositories
- **Errors**: Custom error classes cho use cases

### Infrastructure Layer

- **Config**: Environment variables, constants, providers
- **Database**: Prisma setup, schema, client
- **Repositories**: Implement repository interfaces từ domain

### Presentation Layer

- **Components**: React components (không chứa business logic)
- **Hooks**: Custom React hooks để gọi use cases

### App Layer

- **API Routes**: Next.js route handlers, gọi use cases
- **Pages**: Next.js pages, sử dụng presentation components

## Best Practices

1. **Domain Layer**: Chỉ chứa business logic thuần túy, không có dependencies
2. **Usecase Layer**: Orchestrate use cases, không biết về UI hay database cụ thể
3. **Infrastructure Layer**: Implement các interface từ Domain
4. **Presentation Layer**: Chỉ xử lý UI logic, gọi use cases
5. **App Layer**: Route handlers và page components, gọi vào Usecase layer
