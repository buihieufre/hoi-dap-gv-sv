/**
 * Unit Tests for Create Answer Use Case
 */

import { CreateAnswerUseCase } from "@/usecase/answer/create-answer.usecase";
import {
  MockUserRepository,
  MockQuestionRepository,
  MockAnswerRepository,
} from "@/tests/mocks/repositories.mock";
import {
  createStudentUser,
  createAdvisorUser,
  createAdminUser,
  createOpenQuestion,
  createClosedQuestion,
} from "@/tests/mocks/test-data";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "@/usecase/errors/app-error";

describe("CreateAnswerUseCase", () => {
  let createAnswerUseCase: CreateAnswerUseCase;
  let mockAnswerRepository: MockAnswerRepository;
  let mockQuestionRepository: MockQuestionRepository;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    // Setup users
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

    // Setup questions
    const openQuestion = createOpenQuestion({
      id: "question-1",
      title: "Open Question",
      authorId: "student-1",
    });

    const closedQuestion = createClosedQuestion({
      id: "question-closed",
      title: "Closed Question",
      authorId: "student-1",
    });

    mockAnswerRepository = new MockAnswerRepository([]);
    mockQuestionRepository = new MockQuestionRepository([openQuestion, closedQuestion]);
    mockUserRepository = new MockUserRepository([student, advisor, admin]);

    createAnswerUseCase = new CreateAnswerUseCase(
      mockAnswerRepository,
      mockQuestionRepository,
      mockUserRepository
    );
  });

  describe("Successful Answer Creation", () => {
    it("should create an answer by an advisor", async () => {
      const result = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "This is the answer content",
        authorId: "advisor-1",
      });

      expect(result).toBeDefined();
      expect(result.content).toBe("This is the answer content");
      expect(result.authorId).toBe("advisor-1");
      expect(result.questionId).toBe("question-1");
      expect(result.isPinned).toBe(false);
    });

    it("should create an answer by an admin", async () => {
      const result = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Admin answer",
        authorId: "admin-1",
      });

      expect(result).toBeDefined();
      expect(result.authorId).toBe("admin-1");
    });

    it("should trim answer content", async () => {
      const result = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "  Trimmed content  ",
        authorId: "advisor-1",
      });

      expect(result.content).toBe("Trimmed content");
    });

    it("should update question status to ANSWERED when question was OPEN", async () => {
      await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Answer content",
        authorId: "advisor-1",
      });

      // Verify question status was updated
      const updatedQuestion = await mockQuestionRepository.findById("question-1");
      expect(updatedQuestion?.status).toBe("ANSWERED");
    });

    it("should not change question status if already ANSWERED", async () => {
      // First answer
      await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "First answer",
        authorId: "advisor-1",
      });

      // Second answer
      await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Second answer",
        authorId: "admin-1",
      });

      const question = await mockQuestionRepository.findById("question-1");
      expect(question?.status).toBe("ANSWERED");
    });
  });

  describe("Validation Errors", () => {
    it("should throw ValidationError when content is empty", async () => {
      await expect(
        createAnswerUseCase.execute({
          questionId: "question-1",
          content: "",
          authorId: "advisor-1",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        createAnswerUseCase.execute({
          questionId: "question-1",
          content: "",
          authorId: "advisor-1",
        })
      ).rejects.toThrow("Content is required");
    });

    it("should throw ValidationError when content is only whitespace", async () => {
      await expect(
        createAnswerUseCase.execute({
          questionId: "question-1",
          content: "   ",
          authorId: "advisor-1",
        })
      ).rejects.toThrow("Content is required");
    });

    it("should throw ValidationError when question cannot be answered (CLOSED)", async () => {
      await expect(
        createAnswerUseCase.execute({
          questionId: "question-closed",
          content: "Answer to closed question",
          authorId: "advisor-1",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        createAnswerUseCase.execute({
          questionId: "question-closed",
          content: "Answer to closed question",
          authorId: "advisor-1",
        })
      ).rejects.toThrow("Question cannot be answered");
    });
  });

  describe("Not Found Errors", () => {
    it("should throw NotFoundError when question does not exist", async () => {
      await expect(
        createAnswerUseCase.execute({
          questionId: "non-existent-question",
          content: "Answer content",
          authorId: "advisor-1",
        })
      ).rejects.toThrow(NotFoundError);

      await expect(
        createAnswerUseCase.execute({
          questionId: "non-existent-question",
          content: "Answer content",
          authorId: "advisor-1",
        })
      ).rejects.toThrow("Question not found");
    });

    it("should throw NotFoundError when user does not exist", async () => {
      await expect(
        createAnswerUseCase.execute({
          questionId: "question-1",
          content: "Answer content",
          authorId: "non-existent-user",
        })
      ).rejects.toThrow(NotFoundError);

      await expect(
        createAnswerUseCase.execute({
          questionId: "question-1",
          content: "Answer content",
          authorId: "non-existent-user",
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("Permission Errors", () => {
    it("should throw ForbiddenError when student tries to answer", async () => {
      await expect(
        createAnswerUseCase.execute({
          questionId: "question-1",
          content: "Student answer",
          authorId: "student-1",
        })
      ).rejects.toThrow(ForbiddenError);

      await expect(
        createAnswerUseCase.execute({
          questionId: "question-1",
          content: "Student answer",
          authorId: "student-1",
        })
      ).rejects.toThrow("User cannot answer questions");
    });
  });

  describe("Role-based Answer Permissions", () => {
    it("should allow ADVISOR to create answer", async () => {
      const advisor = createAdvisorUser();
      expect(advisor.canAnswerQuestion()).toBe(true);

      const result = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Advisor answer",
        authorId: "advisor-1",
      });

      expect(result).toBeDefined();
    });

    it("should allow ADMIN to create answer", async () => {
      const admin = createAdminUser();
      expect(admin.canAnswerQuestion()).toBe(true);

      const result = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Admin answer",
        authorId: "admin-1",
      });

      expect(result).toBeDefined();
    });

    it("should NOT allow STUDENT to create answer", async () => {
      const student = createStudentUser();
      expect(student.canAnswerQuestion()).toBe(false);

      await expect(
        createAnswerUseCase.execute({
          questionId: "question-1",
          content: "Student answer",
          authorId: "student-1",
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Question Status Transitions", () => {
    it("should work with OPEN questions", async () => {
      const result = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Answer",
        authorId: "advisor-1",
      });

      expect(result).toBeDefined();
    });

    it("should work with ANSWERED questions (allow multiple answers)", async () => {
      // Create first answer
      await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "First answer",
        authorId: "advisor-1",
      });

      // Create second answer - should work
      const result = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Second answer",
        authorId: "admin-1",
      });

      expect(result).toBeDefined();
    });

    it("should NOT work with CLOSED questions", async () => {
      await expect(
        createAnswerUseCase.execute({
          questionId: "question-closed",
          content: "Answer to closed",
          authorId: "advisor-1",
        })
      ).rejects.toThrow("Question cannot be answered");
    });

    it("should NOT work with DUPLICATE questions", async () => {
      const duplicateQuestion = createOpenQuestion({
        id: "question-duplicate",
        status: "DUPLICATE",
        duplicateOfId: "question-1",
      });
      mockQuestionRepository.reset([
        ...mockQuestionRepository.getAll(),
        duplicateQuestion,
      ]);

      await expect(
        createAnswerUseCase.execute({
          questionId: "question-duplicate",
          content: "Answer to duplicate",
          authorId: "advisor-1",
        })
      ).rejects.toThrow("Question cannot be answered");
    });
  });

  describe("Error Status Codes", () => {
    it("should return 400 for ValidationError", async () => {
      try {
        await createAnswerUseCase.execute({
          questionId: "question-1",
          content: "",
          authorId: "advisor-1",
        });
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).statusCode).toBe(400);
      }
    });

    it("should return 403 for ForbiddenError", async () => {
      try {
        await createAnswerUseCase.execute({
          questionId: "question-1",
          content: "Answer",
          authorId: "student-1",
        });
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).statusCode).toBe(403);
      }
    });

    it("should return 404 for NotFoundError", async () => {
      try {
        await createAnswerUseCase.execute({
          questionId: "non-existent",
          content: "Answer",
          authorId: "advisor-1",
        });
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).statusCode).toBe(404);
      }
    });
  });

  describe("Multiple Answers", () => {
    it("should allow multiple answers to the same question", async () => {
      const answer1 = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "First answer",
        authorId: "advisor-1",
      });

      const answer2 = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Second answer",
        authorId: "admin-1",
      });

      expect(answer1.id).not.toBe(answer2.id);
      expect(answer1.questionId).toBe(answer2.questionId);
    });

    it("should allow same user to answer multiple times", async () => {
      const answer1 = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "First answer by advisor",
        authorId: "advisor-1",
      });

      const answer2 = await createAnswerUseCase.execute({
        questionId: "question-1",
        content: "Second answer by same advisor",
        authorId: "advisor-1",
      });

      expect(answer1.authorId).toBe(answer2.authorId);
      expect(answer1.id).not.toBe(answer2.id);
    });
  });
});

