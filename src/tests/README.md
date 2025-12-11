# Testing Guide - Hệ thống Quản lý Hỏi Đáp

## 📋 Tổng quan

Dự án sử dụng các công cụ testing sau:
- **Jest** - Unit tests và Integration tests
- **React Testing Library** - Component tests
- **Playwright** - End-to-end tests

## 📁 Cấu trúc thư mục Tests

```
src/tests/
├── unit/                    # Unit tests
│   ├── domain/             # Domain model tests
│   │   ├── user.model.test.ts
│   │   ├── question.model.test.ts
│   │   └── answer.model.test.ts
│   ├── usecase/            # Use case tests
│   │   ├── login.usecase.test.ts
│   │   ├── register.usecase.test.ts
│   │   ├── create-question.usecase.test.ts
│   │   └── create-answer.usecase.test.ts
│   └── utils/              # Utility function tests
│       ├── csv-parser.test.ts
│       ├── slug.test.ts
│       └── app-error.test.ts
├── integration/            # Integration tests
│   └── api/               # API route tests
│       ├── auth.test.ts
│       ├── questions.test.ts
│       └── categories.test.ts
├── e2e/                   # End-to-end tests
│   ├── auth.spec.ts
│   ├── questions.spec.ts
│   └── admin.spec.ts
├── mocks/                 # Test mocks và fixtures
│   ├── repositories.mock.ts
│   └── test-data.ts
└── setup.ts               # Jest setup file
```

## 🚀 Chạy Tests

### Unit Tests

```bash
# Chạy tất cả unit tests
npm run test:unit

# Chạy tests với watch mode
npm run test:watch

# Chạy tests với coverage report
npm run test:coverage
```

### Integration Tests

```bash
# Chạy integration tests
npm run test:integration
```

### E2E Tests

```bash
# Cài đặt Playwright browsers (chỉ cần chạy 1 lần)
npx playwright install

# Chạy E2E tests
npm run test:e2e

# Chạy E2E tests với UI mode
npm run test:e2e:ui

# Chạy E2E tests với browser hiển thị
npm run test:e2e:headed
```

### Chạy tất cả Tests

```bash
npm run test:all
```

## 📝 Viết Tests

### Unit Test Example

```typescript
import { User } from "@/domain/models/user.model";

describe("User Domain Model", () => {
  it("should allow student to create questions", () => {
    const student = new User(
      "id-1",
      "student@example.com",
      "password",
      "Student Name",
      "STUDENT"
    );
    
    expect(student.canCreateQuestion()).toBe(true);
  });
});
```

### Integration Test Example

```typescript
import { NextRequest } from "next/server";
import { POST as loginHandler } from "@/app/api/auth/login/route";

describe("Login API", () => {
  it("should return 400 when email is missing", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password: "password123" }),
    });

    const response = await loginHandler(request);
    expect(response.status).toBe(400);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from "@playwright/test";

test("should display login form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});
```

## 🧪 Test Coverage Goals

| Loại Test | Mục tiêu Coverage |
|-----------|-------------------|
| Unit Tests | 80% |
| Integration Tests | 70% |
| E2E Tests | Các user flows chính |

## 📊 Coverage Report

Sau khi chạy `npm run test:coverage`, xem báo cáo tại:
- Console output
- `coverage/lcov-report/index.html`

## 🔧 Test Configuration

### Jest Config (`jest.config.ts`)

```typescript
export default {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  testMatch: [
    "<rootDir>/src/tests/unit/**/*.test.ts",
    "<rootDir>/src/tests/integration/**/*.test.ts",
  ],
};
```

### Playwright Config (`playwright.config.ts`)

```typescript
export default {
  testDir: "./src/tests/e2e",
  baseURL: "http://localhost:3000",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
};
```

## 🎯 Best Practices

1. **Naming Convention**: Test files nên có suffix `.test.ts` (Jest) hoặc `.spec.ts` (Playwright)

2. **Arrange-Act-Assert**: Mỗi test case nên theo pattern AAA

3. **Mock External Dependencies**: Sử dụng mocks cho database, APIs, etc.

4. **Independent Tests**: Mỗi test case nên độc lập, không phụ thuộc thứ tự chạy

5. **Descriptive Names**: Tên test case nên mô tả rõ behavior được test

## 🐛 Troubleshooting

### Jest không tìm thấy module

```bash
# Xóa cache và chạy lại
npm run test -- --clearCache
```

### Playwright browsers lỗi

```bash
# Cài đặt lại browsers
npx playwright install --force
```

### Tests timeout

Tăng timeout trong config hoặc trong test case:

```typescript
// Trong test file
jest.setTimeout(30000);

// Trong Playwright
test.setTimeout(60000);
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)

