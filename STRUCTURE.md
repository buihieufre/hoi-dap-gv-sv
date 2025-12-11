# Cấu trúc Dự án - Tóm tắt

## 4 Layer Chính

```
src/
├── domain/            # Core Domain - Models + Repository interfaces
├── usecase/           # Use Cases - Business Logic Orchestration
├── infrastructure/    # External Concerns - Config + Database + Repositories
└── presentation/      # UI Layer - Components + Hooks
```

## Chi tiết

```
src/
├── app/                    # Next.js App Router
│   ├── (public-pages)/     # Pages công khai
│   ├── (protected)/        # Pages cần auth
│   └── api/                # API routes
│
├── domain/                 # Core Domain
│   ├── models/            # Domain models
│   └── repositories/      # Repository interfaces
│
├── usecase/                # Use Cases
│   ├── user/              # User use cases
│   ├── question/          # Question use cases
│   ├── answer/            # Answer use cases
│   └── errors/            # Error classes
│
├── infrastructure/         # External Concerns
│   ├── config/            # Config (env, constants)
│   ├── database/          # Database (Prisma)
│   └── repositories/      # Repository implementations
│
├── presentation/          # UI Layer
│   ├── components/        # React components
│   └── hooks/             # Custom hooks
│
├── shared/                 # Shared Utilities
│   ├── utils/             # Helper functions
│   ├── constants/         # Constants
│   └── types/             # Types
│
└── tests/                  # Tests
    ├── unit/
    ├── integration/
    └── e2e/
```

## Dependency Flow

```
app → presentation → usecase → domain ← infrastructure
```

## Nguyên tắc

1. **Domain**: Chỉ models và repository interfaces
2. **Usecase**: Use cases và errors
3. **Infrastructure**: Config, Database, Repository implementations
4. **Presentation**: Components và hooks
5. **App**: API routes và pages
