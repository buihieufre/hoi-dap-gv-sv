# Presentation Layer

## Mục đích

Presentation layer chứa **UI components và hooks** để tương tác với usecase layer.

## Cấu trúc

```
presentation/
├── components/      # React components
└── hooks/           # Custom React hooks
```

## Components

React components (không chứa business logic):

- `QuestionForm.tsx` - Form tạo câu hỏi
- `QuestionList.tsx` - Danh sách câu hỏi
- `AnswerCard.tsx` - Card hiển thị câu trả lời
- ...

**Ví dụ:**

```typescript
// presentation/components/QuestionForm.tsx
"use client";

import { useCreateQuestion } from "@/presentation/hooks/use-create-question";

export function QuestionForm() {
  const { createQuestion, isLoading } = useCreateQuestion();

  const handleSubmit = async (data: FormData) => {
    await createQuestion({
      title: data.get("title") as string,
      content: data.get("content") as string,
      categoryId: data.get("categoryId") as string,
    });
  };

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

## Hooks

Custom React hooks để gọi use cases:

- `use-create-question.ts` - Hook tạo câu hỏi
- `use-login.ts` - Hook đăng nhập
- `use-questions.ts` - Hook lấy danh sách câu hỏi
- ...

**Ví dụ:**

```typescript
// presentation/hooks/use-create-question.ts
"use client";

import { useState } from "react";
import { CreateQuestionUseCase } from "@/usecase/question/create-question.usecase";

export function useCreateQuestion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createQuestion = async (data: {
    title: string;
    content: string;
    categoryId: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Gọi use case qua API route hoặc trực tiếp
      const response = await fetch("/api/questions", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create question");
      }

      return await response.json();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { createQuestion, isLoading, error };
}
```

## Nguyên tắc

1. ✅ **UI logic only**: Chỉ chứa logic UI, không có business logic
2. ✅ **Call use cases**: Gọi use cases qua hooks hoặc API routes
3. ✅ **Reusable**: Components và hooks có thể tái sử dụng
4. ❌ **Không có business logic**: Business logic ở usecase layer
