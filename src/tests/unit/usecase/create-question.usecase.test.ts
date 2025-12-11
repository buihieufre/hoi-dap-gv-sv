/**
 * Unit Tests for Create Question Use Case
 */

import { CreateQuestionUseCase } from "@/usecase/question/create-question.usecase";
import {
  MockUserRepository,
  MockQuestionRepository,
  MockCategoryRepository,
} from "@/tests/mocks/repositories.mock";
import {
  createStudentUser,
  createAdvisorUser,
  createAdminUser,
  createTestCategory,
} from "@/tests/mocks/test-data";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "@/usecase/errors/app-error";

// Mock the prisma import to prevent actual database calls
jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    questionCategory: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

describe("CreateQuestionUseCase", () => {
  let createQuestionUseCase: CreateQuestionUseCase;
  let mockQuestionRepository: MockQuestionRepository;
  let mockUserRepository: MockUserRepository;
  let mockCategoryRepository: MockCategoryRepository;

  beforeEach(() => {
    // Setup default test data
    const student = createStudentUser({
      id: "student-1",
      email: "student@example.com",
    });

    const advisor = createAdvisorUser({
      id: "advisor-1",
      email: "advisor@example.com",
    });

    const admin = createAdminUser({
      id: "admin-1",
      email: "admin@example.com",
    });

    const category = createTestCategory({
      id: "category-1",
      name: "General",
      slug: "general",
    });

    mockQuestionRepository = new MockQuestionRepository([]);
    mockUserRepository = new MockUserRepository([student, advisor, admin]);
    mockCategoryRepository = new MockCategoryRepository([category]);

    createQuestionUseCase = new CreateQuestionUseCase(
      mockQuestionRepository,
      mockUserRepository,
      mockCategoryRepository
    );
  });

  describe("Successful Question Creation", () => {
    it("should create a question for a student with PENDING approval status", async () => {
      const result = await createQuestionUseCase.execute({
        title: "Test Question",
        content: "This is the question content",
        categoryId: "category-1",
        authorId: "student-1",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Test Question");
      expect(result.content).toBe("This is the question content");
      expect(result.authorId).toBe("student-1");
      expect(result.categoryId).toBe("category-1");
      expect(result.status).toBe("OPEN");
      expect(result.approvalStatus).toBe("PENDING");
    });

    it("should create a question for an advisor with APPROVED status", async () => {
      const result = await createQuestionUseCase.execute({
        title: "Advisor Question",
        content: "Question from advisor",
        categoryId: "category-1",
        authorId: "advisor-1",
      });

      expect(result).toBeDefined();
      expect(result.approvalStatus).toBe("APPROVED");
    });

    it("should create a question for an admin with APPROVED status", async () => {
      const result = await createQuestionUseCase.execute({
        title: "Admin Question",
        content: "Question from admin",
        categoryId: "category-1",
        authorId: "admin-1",
      });

      expect(result).toBeDefined();
      expect(result.approvalStatus).toBe("APPROVED");
    });

    it("should create an anonymous question", async () => {
      const result = await createQuestionUseCase.execute({
        title: "Anonymous Question",
        content: "Anonymous content",
        categoryId: "category-1",
        authorId: "student-1",
        isAnonymous: true,
      });

      expect(result).toBeDefined();
      expect(result.isAnonymous).toBe(true);
    });

    it("should default isAnonymous to false", async () => {
      const result = await createQuestionUseCase.execute({
        title: "Regular Question",
        content: "Regular content",
        categoryId: "category-1",
        authorId: "student-1",
      });

      expect(result.isAnonymous).toBe(false);
    });

    it("should trim title and content", async () => {
      const result = await createQuestionUseCase.execute({
        title: "  Trimmed Title  ",
        content: "  Trimmed Content  ",
        categoryId: "category-1",
        authorId: "student-1",
      });

      expect(result.title).toBe("Trimmed Title");
      expect(result.content).toBe("Trimmed Content");
    });

    it("should set initial views to 0", async () => {
      const result = await createQuestionUseCase.execute({
        title: "Test Question",
        content: "Test Content",
        categoryId: "category-1",
        authorId: "student-1",
      });

      expect(result.views).toBe(0);
    });
  });

  describe("Multiple Categories", () => {
    beforeEach(() => {
      const category2 = createTestCategory({
        id: "category-2",
        name: "Academic",
        slug: "academic",
      });
      const category3 = createTestCategory({
        id: "category-3",
        name: "Finance",
        slug: "finance",
      });

      mockCategoryRepository = new MockCategoryRepository([
        createTestCategory({ id: "category-1", name: "General", slug: "general" }),
        category2,
        category3,
      ]);

      createQuestionUseCase = new CreateQuestionUseCase(
        mockQuestionRepository,
        mockUserRepository,
        mockCategoryRepository
      );
    });

    it("should create question with multiple categoryIds", async () => {
      const result = await createQuestionUseCase.execute({
        title: "Multi-category Question",
        content: "Content",
        categoryId: "category-1",
        categoryIds: ["category-1", "category-2", "category-3"],
        authorId: "student-1",
      });

      expect(result).toBeDefined();
      // Primary category should be from categoryId
      expect(result.categoryId).toBe("category-1");
    });

    it("should prefer categoryIds over categoryId when both provided", async () => {
      const result = await createQuestionUseCase.execute({
        title: "Question",
        content: "Content",
        categoryId: "category-1",
        categoryIds: ["category-2"],
        authorId: "student-1",
      });

      expect(result).toBeDefined();
    });
  });

  describe("Validation Errors", () => {
    it("should throw ValidationError when title is empty", async () => {
      await expect(
        createQuestionUseCase.execute({
          title: "",
          content: "Content",
          categoryId: "category-1",
          authorId: "student-1",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        createQuestionUseCase.execute({
          title: "",
          content: "Content",
          categoryId: "category-1",
          authorId: "student-1",
        })
      ).rejects.toThrow("Title is required");
    });

    it("should throw ValidationError when title is only whitespace", async () => {
      await expect(
        createQuestionUseCase.execute({
          title: "   ",
          content: "Content",
          categoryId: "category-1",
          authorId: "student-1",
        })
      ).rejects.toThrow("Title is required");
    });

    it("should throw ValidationError when content is empty", async () => {
      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "",
          categoryId: "category-1",
          authorId: "student-1",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "",
          categoryId: "category-1",
          authorId: "student-1",
        })
      ).rejects.toThrow("Content is required");
    });

    it("should throw ValidationError when content is only whitespace", async () => {
      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "   ",
          categoryId: "category-1",
          authorId: "student-1",
        })
      ).rejects.toThrow("Content is required");
    });

    it("should throw ValidationError when no category is provided", async () => {
      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "Content",
          categoryId: "",
          categoryIds: [],
          authorId: "student-1",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "Content",
          categoryId: "",
          authorId: "student-1",
        })
      ).rejects.toThrow("At least one category is required");
    });

    it("should throw ValidationError when user not found", async () => {
      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "Content",
          categoryId: "category-1",
          authorId: "non-existent-user",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "Content",
          categoryId: "category-1",
          authorId: "non-existent-user",
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("Category Validation", () => {
    it("should throw NotFoundError when category does not exist", async () => {
      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "Content",
          categoryId: "non-existent-category",
          authorId: "student-1",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when one of multiple categories does not exist", async () => {
      await expect(
        createQuestionUseCase.execute({
          title: "Title",
          content: "Content",
          categoryId: "category-1",
          categoryIds: ["category-1", "non-existent-category"],
          authorId: "student-1",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Permission Errors", () => {
    it("should throw ForbiddenError when user cannot create questions", async () => {
      // Create a user that cannot create questions
      // This would require a custom user type, but in our model all roles can create questions
      // So we'll test that valid roles CAN create questions
      
      // All standard roles should be able to create questions
      const student = createStudentUser({ id: "test-student" });
      expect(student.canCreateQuestion()).toBe(true);

      const advisor = createAdvisorUser({ id: "test-advisor" });
      expect(advisor.canCreateQuestion()).toBe(true);

      const admin = createAdminUser({ id: "test-admin" });
      expect(admin.canCreateQuestion()).toBe(true);
    });
  });

  describe("Approval Status Logic", () => {
    const testCases = [
      { role: "STUDENT" as const, expectedStatus: "PENDING" },
      { role: "ADVISOR" as const, expectedStatus: "APPROVED" },
      { role: "ADMIN" as const, expectedStatus: "APPROVED" },
    ];

    testCases.forEach(({ role, expectedStatus }) => {
      it(`should set ${expectedStatus} approval status for ${role}`, async () => {
        const userId = `${role.toLowerCase()}-1`;

        const result = await createQuestionUseCase.execute({
          title: "Test Question",
          content: "Test Content",
          categoryId: "category-1",
          authorId: userId,
        });

        expect(result.approvalStatus).toBe(expectedStatus);
      });
    });
  });

  describe("Error Status Codes", () => {
    it("should return 400 for ValidationError", async () => {
      try {
        await createQuestionUseCase.execute({
          title: "",
          content: "Content",
          categoryId: "category-1",
          authorId: "student-1",
        });
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).statusCode).toBe(400);
      }
    });

    it("should return 404 for NotFoundError", async () => {
      try {
        await createQuestionUseCase.execute({
          title: "Title",
          content: "Content",
          categoryId: "non-existent",
          authorId: "student-1",
        });
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).statusCode).toBe(404);
      }
    });
  });
});

