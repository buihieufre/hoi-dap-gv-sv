/**
 * Unit Tests for Question Domain Model
 */

import { Question } from "@/domain/models/question.model";
import {
  createTestQuestion,
  createOpenQuestion,
  createAnsweredQuestion,
  createClosedQuestion,
  createPendingQuestion,
  createAnonymousQuestion,
} from "@/tests/mocks/test-data";

describe("Question Domain Model", () => {
  describe("Constructor", () => {
    it("should create a question with all properties", () => {
      const question = new Question(
        "question-1",
        "Test Title",
        "Test Content",
        "OPEN",
        "author-1",
        "category-1",
        100,
        "accepted-answer-1",
        "duplicate-of-1",
        "APPROVED",
        false,
        new Date("2024-01-01"),
        new Date("2024-01-02")
      );

      expect(question.id).toBe("question-1");
      expect(question.title).toBe("Test Title");
      expect(question.content).toBe("Test Content");
      expect(question.status).toBe("OPEN");
      expect(question.authorId).toBe("author-1");
      expect(question.categoryId).toBe("category-1");
      expect(question.views).toBe(100);
      expect(question.acceptedAnswerId).toBe("accepted-answer-1");
      expect(question.duplicateOfId).toBe("duplicate-of-1");
      expect(question.approvalStatus).toBe("APPROVED");
      expect(question.isAnonymous).toBe(false);
      expect(question.createdAt).toEqual(new Date("2024-01-01"));
      expect(question.updatedAt).toEqual(new Date("2024-01-02"));
    });

    it("should create a question with default values", () => {
      const question = new Question(
        "question-1",
        "Test Title",
        "Test Content",
        "OPEN",
        "author-1",
        "category-1"
      );

      expect(question.views).toBe(0);
      expect(question.isAnonymous).toBe(false);
    });

    it("should create an anonymous question", () => {
      const question = createAnonymousQuestion();
      expect(question.isAnonymous).toBe(true);
    });
  });

  describe("canBeAnswered", () => {
    it("should return true for OPEN status", () => {
      const question = createOpenQuestion();
      expect(question.canBeAnswered()).toBe(true);
    });

    it("should return true for ANSWERED status", () => {
      const question = createAnsweredQuestion();
      expect(question.canBeAnswered()).toBe(true);
    });

    it("should return false for CLOSED status", () => {
      const question = createClosedQuestion();
      expect(question.canBeAnswered()).toBe(false);
    });

    it("should return false for DUPLICATE status", () => {
      const question = createTestQuestion({ status: "DUPLICATE" });
      expect(question.canBeAnswered()).toBe(false);
    });
  });

  describe("canBeClosed", () => {
    it("should return true for OPEN status", () => {
      const question = createOpenQuestion();
      expect(question.canBeClosed()).toBe(true);
    });

    it("should return true for ANSWERED status", () => {
      const question = createAnsweredQuestion();
      expect(question.canBeClosed()).toBe(true);
    });

    it("should return false for CLOSED status", () => {
      const question = createClosedQuestion();
      expect(question.canBeClosed()).toBe(false);
    });

    it("should return false for DUPLICATE status", () => {
      const question = createTestQuestion({ status: "DUPLICATE" });
      expect(question.canBeClosed()).toBe(false);
    });
  });

  describe("markAsAnswered", () => {
    it("should return a new Question with ANSWERED status and acceptedAnswerId", () => {
      const question = createOpenQuestion();
      const answeredQuestion = question.markAsAnswered("answer-123");

      // Original question should be unchanged
      expect(question.status).toBe("OPEN");
      expect(question.acceptedAnswerId).toBeNull();

      // New question should have updated values
      expect(answeredQuestion.status).toBe("ANSWERED");
      expect(answeredQuestion.acceptedAnswerId).toBe("answer-123");

      // Other properties should be preserved
      expect(answeredQuestion.id).toBe(question.id);
      expect(answeredQuestion.title).toBe(question.title);
      expect(answeredQuestion.content).toBe(question.content);
      expect(answeredQuestion.authorId).toBe(question.authorId);
      expect(answeredQuestion.categoryId).toBe(question.categoryId);
      expect(answeredQuestion.views).toBe(question.views);
      expect(answeredQuestion.isAnonymous).toBe(question.isAnonymous);
    });

    it("should preserve approvalStatus when marking as answered", () => {
      const question = createPendingQuestion();
      const answeredQuestion = question.markAsAnswered("answer-123");

      expect(answeredQuestion.approvalStatus).toBe("PENDING");
    });
  });

  describe("markAsClosed", () => {
    it("should return a new Question with CLOSED status", () => {
      const question = createAnsweredQuestion();
      const closedQuestion = question.markAsClosed();

      // Original question should be unchanged
      expect(question.status).toBe("ANSWERED");

      // New question should have updated status
      expect(closedQuestion.status).toBe("CLOSED");

      // Other properties should be preserved
      expect(closedQuestion.id).toBe(question.id);
      expect(closedQuestion.title).toBe(question.title);
      expect(closedQuestion.content).toBe(question.content);
      expect(closedQuestion.acceptedAnswerId).toBe(question.acceptedAnswerId);
    });

    it("should preserve all other properties when closing", () => {
      const question = createAnonymousQuestion({
        views: 50,
        approvalStatus: "APPROVED",
        duplicateOfId: "dup-123",
      });

      const closedQuestion = question.markAsClosed();

      expect(closedQuestion.views).toBe(50);
      expect(closedQuestion.isAnonymous).toBe(true);
      expect(closedQuestion.approvalStatus).toBe("APPROVED");
      expect(closedQuestion.duplicateOfId).toBe("dup-123");
    });
  });

  describe("incrementViews", () => {
    it("should return a new Question with views incremented by 1", () => {
      const question = createTestQuestion({ views: 10 });
      const viewedQuestion = question.incrementViews();

      // Original question should be unchanged
      expect(question.views).toBe(10);

      // New question should have incremented views
      expect(viewedQuestion.views).toBe(11);
    });

    it("should handle starting from 0 views", () => {
      const question = createTestQuestion({ views: 0 });
      const viewedQuestion = question.incrementViews();

      expect(viewedQuestion.views).toBe(1);
    });

    it("should preserve all other properties", () => {
      const question = createAnonymousQuestion({
        status: "ANSWERED",
        acceptedAnswerId: "ans-1",
        views: 100,
      });

      const viewedQuestion = question.incrementViews();

      expect(viewedQuestion.id).toBe(question.id);
      expect(viewedQuestion.title).toBe(question.title);
      expect(viewedQuestion.status).toBe("ANSWERED");
      expect(viewedQuestion.acceptedAnswerId).toBe("ans-1");
      expect(viewedQuestion.isAnonymous).toBe(true);
      expect(viewedQuestion.views).toBe(101);
    });

    it("should allow chaining multiple increments", () => {
      const question = createTestQuestion({ views: 0 });
      const viewedQuestion = question
        .incrementViews()
        .incrementViews()
        .incrementViews();

      expect(viewedQuestion.views).toBe(3);
      expect(question.views).toBe(0); // Original unchanged
    });
  });

  describe("Status transitions", () => {
    it("should allow OPEN -> ANSWERED -> CLOSED transition", () => {
      const openQuestion = createOpenQuestion();
      expect(openQuestion.status).toBe("OPEN");
      expect(openQuestion.canBeAnswered()).toBe(true);

      const answeredQuestion = openQuestion.markAsAnswered("ans-1");
      expect(answeredQuestion.status).toBe("ANSWERED");
      expect(answeredQuestion.canBeClosed()).toBe(true);

      const closedQuestion = answeredQuestion.markAsClosed();
      expect(closedQuestion.status).toBe("CLOSED");
      expect(closedQuestion.canBeAnswered()).toBe(false);
      expect(closedQuestion.canBeClosed()).toBe(false);
    });

    it("should allow OPEN -> CLOSED transition (without answering)", () => {
      const openQuestion = createOpenQuestion();
      const closedQuestion = openQuestion.markAsClosed();

      expect(closedQuestion.status).toBe("CLOSED");
      expect(closedQuestion.acceptedAnswerId).toBeNull();
    });
  });

  describe("Approval Status", () => {
    const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;

    statuses.forEach((approvalStatus) => {
      it(`should handle ${approvalStatus} approval status`, () => {
        const question = createTestQuestion({ approvalStatus });
        expect(question.approvalStatus).toBe(approvalStatus);
      });
    });
  });

  describe("Question Status types", () => {
    const statuses = ["OPEN", "ANSWERED", "CLOSED", "DUPLICATE"] as const;

    statuses.forEach((status) => {
      it(`should handle ${status} question status`, () => {
        const question = createTestQuestion({ status });
        expect(question.status).toBe(status);
      });
    });
  });
});

