/**
 * Test Data Factories
 * Reusable test data for all test files
 */

import { User } from "@/domain/models/user.model";
import { Question } from "@/domain/models/question.model";
import { Answer } from "@/domain/models/answer.model";
import { Category } from "./repositories.mock";
import bcrypt from "bcryptjs";

// ==================== User Test Data ====================

export const createTestUser = (overrides: Partial<User> = {}): User => {
  return new User(
    overrides.id || "user-test-1",
    overrides.email || "test@example.com",
    overrides.password || "$2a$10$hashedpassword",
    overrides.fullName || "Test User",
    overrides.role || "STUDENT",
    overrides.studentId || "SV001",
    overrides.advisorId || null,
    overrides.createdAt || new Date("2024-01-01"),
    overrides.updatedAt || new Date("2024-01-01")
  );
};

export const createStudentUser = (overrides: Partial<User> = {}): User => {
  return createTestUser({
    role: "STUDENT",
    studentId: "SV" + Math.random().toString().slice(2, 6),
    ...overrides,
  });
};

export const createAdvisorUser = (overrides: Partial<User> = {}): User => {
  return createTestUser({
    role: "ADVISOR",
    advisorId: "GV" + Math.random().toString().slice(2, 6),
    studentId: null,
    ...overrides,
  });
};

export const createAdminUser = (overrides: Partial<User> = {}): User => {
  return createTestUser({
    role: "ADMIN",
    studentId: null,
    advisorId: null,
    ...overrides,
  });
};

// Hash password for testing
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

// ==================== Question Test Data ====================

export const createTestQuestion = (
  overrides: Partial<Question> = {}
): Question => {
  return new Question(
    overrides.id || "question-test-1",
    overrides.title || "Test Question Title",
    overrides.content || "Test question content with some details",
    overrides.status || "OPEN",
    overrides.authorId || "user-test-1",
    overrides.categoryId || "category-test-1",
    overrides.views || 0,
    overrides.acceptedAnswerId || null,
    overrides.duplicateOfId || null,
    overrides.approvalStatus || "APPROVED",
    overrides.isAnonymous || false,
    overrides.createdAt || new Date("2024-01-01"),
    overrides.updatedAt || new Date("2024-01-01")
  );
};

export const createOpenQuestion = (
  overrides: Partial<Question> = {}
): Question => {
  return createTestQuestion({
    status: "OPEN",
    approvalStatus: "APPROVED",
    ...overrides,
  });
};

export const createAnsweredQuestion = (
  overrides: Partial<Question> = {}
): Question => {
  return createTestQuestion({
    status: "ANSWERED",
    approvalStatus: "APPROVED",
    acceptedAnswerId: "answer-test-1",
    ...overrides,
  });
};

export const createClosedQuestion = (
  overrides: Partial<Question> = {}
): Question => {
  return createTestQuestion({
    status: "CLOSED",
    approvalStatus: "APPROVED",
    ...overrides,
  });
};

export const createPendingQuestion = (
  overrides: Partial<Question> = {}
): Question => {
  return createTestQuestion({
    status: "OPEN",
    approvalStatus: "PENDING",
    ...overrides,
  });
};

export const createAnonymousQuestion = (
  overrides: Partial<Question> = {}
): Question => {
  return createTestQuestion({
    isAnonymous: true,
    ...overrides,
  });
};

// ==================== Answer Test Data ====================

export const createTestAnswer = (overrides: Partial<Answer> = {}): Answer => {
  return new Answer(
    overrides.id || "answer-test-1",
    overrides.content || "Test answer content with helpful information",
    overrides.authorId || "advisor-test-1",
    overrides.questionId || "question-test-1",
    overrides.isPinned || false,
    overrides.createdAt || new Date("2024-01-01"),
    overrides.updatedAt || new Date("2024-01-01")
  );
};

export const createPinnedAnswer = (overrides: Partial<Answer> = {}): Answer => {
  return createTestAnswer({
    isPinned: true,
    ...overrides,
  });
};

// ==================== Category Test Data ====================

export const createTestCategory = (
  overrides: Partial<Category> = {}
): Category => {
  return {
    id: overrides.id || "category-test-1",
    name: overrides.name || "Test Category",
    slug: overrides.slug || "test-category",
    description: overrides.description || "Test category description",
    parentId: overrides.parentId || null,
  };
};

export const createAcademicCategory = (
  overrides: Partial<Category> = {}
): Category => {
  return createTestCategory({
    name: "Học vụ",
    slug: "hoc-vu",
    description: "Các câu hỏi về học vụ",
    ...overrides,
  });
};

export const createTuitionCategory = (
  overrides: Partial<Category> = {}
): Category => {
  return createTestCategory({
    name: "Học phí",
    slug: "hoc-phi",
    description: "Các câu hỏi về học phí",
    ...overrides,
  });
};

// ==================== Bulk Test Data ====================

export const createMultipleUsers = (count: number): User[] => {
  return Array.from({ length: count }, (_, i) =>
    createTestUser({
      id: `user-${i + 1}`,
      email: `user${i + 1}@example.com`,
      fullName: `User ${i + 1}`,
      studentId: `SV${String(i + 1).padStart(4, "0")}`,
    })
  );
};

export const createMultipleQuestions = (
  count: number,
  authorId: string = "user-test-1",
  categoryId: string = "category-test-1"
): Question[] => {
  return Array.from({ length: count }, (_, i) =>
    createTestQuestion({
      id: `question-${i + 1}`,
      title: `Question ${i + 1}`,
      content: `Content for question ${i + 1}`,
      authorId,
      categoryId,
    })
  );
};

export const createMultipleAnswers = (
  count: number,
  questionId: string = "question-test-1",
  authorId: string = "advisor-test-1"
): Answer[] => {
  return Array.from({ length: count }, (_, i) =>
    createTestAnswer({
      id: `answer-${i + 1}`,
      content: `Answer ${i + 1} content`,
      questionId,
      authorId,
    })
  );
};

// ==================== Editor.js Content ====================

export const createEditorJsContent = (text: string): string => {
  return JSON.stringify({
    time: Date.now(),
    blocks: [
      {
        id: "block-1",
        type: "paragraph",
        data: {
          text: text,
        },
      },
    ],
    version: "2.28.2",
  });
};

export const createComplexEditorJsContent = (): string => {
  return JSON.stringify({
    time: Date.now(),
    blocks: [
      {
        id: "block-1",
        type: "header",
        data: {
          text: "Test Header",
          level: 2,
        },
      },
      {
        id: "block-2",
        type: "paragraph",
        data: {
          text: "This is a test paragraph with some content.",
        },
      },
      {
        id: "block-3",
        type: "list",
        data: {
          style: "unordered",
          items: ["Item 1", "Item 2", "Item 3"],
        },
      },
      {
        id: "block-4",
        type: "code",
        data: {
          code: "console.log('Hello World');",
        },
      },
    ],
    version: "2.28.2",
  });
};

// ==================== CSV Test Data ====================

export const createValidCSVContent = (): string => {
  return `Họ và tên đầy đủ,email,mã sinh viên,role
Nguyễn Văn A,nguyenvana@example.com,SV001,STUDENT
Trần Thị B,tranthib@example.com,SV002,STUDENT
Lê Văn C,levanc@example.com,,ADVISOR`;
};

export const createInvalidCSVContent = (): string => {
  return `Họ và tên đầy đủ,email,mã sinh viên,role
,missing_email@example.com,SV001,STUDENT
Nguyễn Văn A,,SV002,STUDENT`;
};
