/**
 * Unit Tests for Answer Domain Model
 */

import { Answer } from "@/domain/models/answer.model";
import { createTestAnswer, createPinnedAnswer } from "@/tests/mocks/test-data";

describe("Answer Domain Model", () => {
  describe("Constructor", () => {
    it("should create an answer with all properties", () => {
      const answer = new Answer(
        "answer-1",
        "Test answer content",
        "author-1",
        "question-1",
        true,
        new Date("2024-01-01"),
        new Date("2024-01-02")
      );

      expect(answer.id).toBe("answer-1");
      expect(answer.content).toBe("Test answer content");
      expect(answer.authorId).toBe("author-1");
      expect(answer.questionId).toBe("question-1");
      expect(answer.isPinned).toBe(true);
      expect(answer.createdAt).toEqual(new Date("2024-01-01"));
      expect(answer.updatedAt).toEqual(new Date("2024-01-02"));
    });

    it("should create an answer with default isPinned as false", () => {
      const answer = new Answer(
        "answer-1",
        "Test content",
        "author-1",
        "question-1"
      );

      expect(answer.isPinned).toBe(false);
    });

    it("should create an answer with optional dates undefined", () => {
      const answer = new Answer(
        "answer-1",
        "Test content",
        "author-1",
        "question-1",
        false
      );

      expect(answer.createdAt).toBeUndefined();
      expect(answer.updatedAt).toBeUndefined();
    });
  });

  describe("pin", () => {
    it("should return a new Answer with isPinned set to true", () => {
      const answer = createTestAnswer({ isPinned: false });
      const pinnedAnswer = answer.pin();

      // Original should be unchanged
      expect(answer.isPinned).toBe(false);

      // New answer should be pinned
      expect(pinnedAnswer.isPinned).toBe(true);
    });

    it("should preserve all other properties", () => {
      const answer = createTestAnswer({
        id: "ans-123",
        content: "Original content",
        authorId: "auth-456",
        questionId: "q-789",
        isPinned: false,
      });

      const pinnedAnswer = answer.pin();

      expect(pinnedAnswer.id).toBe("ans-123");
      expect(pinnedAnswer.content).toBe("Original content");
      expect(pinnedAnswer.authorId).toBe("auth-456");
      expect(pinnedAnswer.questionId).toBe("q-789");
      expect(pinnedAnswer.createdAt).toEqual(answer.createdAt);
      expect(pinnedAnswer.updatedAt).toEqual(answer.updatedAt);
    });

    it("should work even if already pinned", () => {
      const answer = createPinnedAnswer();
      const stillPinnedAnswer = answer.pin();

      expect(stillPinnedAnswer.isPinned).toBe(true);
    });
  });

  describe("unpin", () => {
    it("should return a new Answer with isPinned set to false", () => {
      const answer = createPinnedAnswer();
      const unpinnedAnswer = answer.unpin();

      // Original should be unchanged
      expect(answer.isPinned).toBe(true);

      // New answer should be unpinned
      expect(unpinnedAnswer.isPinned).toBe(false);
    });

    it("should preserve all other properties", () => {
      const answer = createPinnedAnswer({
        id: "ans-123",
        content: "Original content",
        authorId: "auth-456",
        questionId: "q-789",
      });

      const unpinnedAnswer = answer.unpin();

      expect(unpinnedAnswer.id).toBe("ans-123");
      expect(unpinnedAnswer.content).toBe("Original content");
      expect(unpinnedAnswer.authorId).toBe("auth-456");
      expect(unpinnedAnswer.questionId).toBe("q-789");
    });

    it("should work even if already unpinned", () => {
      const answer = createTestAnswer({ isPinned: false });
      const stillUnpinnedAnswer = answer.unpin();

      expect(stillUnpinnedAnswer.isPinned).toBe(false);
    });
  });

  describe("updateContent", () => {
    it("should return a new Answer with updated content", () => {
      const answer = createTestAnswer({ content: "Original content" });
      const updatedAnswer = answer.updateContent("New updated content");

      // Original should be unchanged
      expect(answer.content).toBe("Original content");

      // New answer should have updated content
      expect(updatedAnswer.content).toBe("New updated content");
    });

    it("should preserve all other properties", () => {
      const answer = createPinnedAnswer({
        id: "ans-123",
        content: "Original",
        authorId: "auth-456",
        questionId: "q-789",
      });

      const updatedAnswer = answer.updateContent("Updated");

      expect(updatedAnswer.id).toBe("ans-123");
      expect(updatedAnswer.authorId).toBe("auth-456");
      expect(updatedAnswer.questionId).toBe("q-789");
      expect(updatedAnswer.isPinned).toBe(true);
      expect(updatedAnswer.createdAt).toEqual(answer.createdAt);
      expect(updatedAnswer.updatedAt).toEqual(answer.updatedAt);
    });

    it("should handle empty content", () => {
      const answer = createTestAnswer({ content: "Original" });
      const updatedAnswer = answer.updateContent("");

      expect(updatedAnswer.content).toBe("");
    });

    it("should handle very long content", () => {
      const answer = createTestAnswer();
      const longContent = "A".repeat(10000);
      const updatedAnswer = answer.updateContent(longContent);

      expect(updatedAnswer.content).toBe(longContent);
      expect(updatedAnswer.content.length).toBe(10000);
    });

    it("should handle content with special characters", () => {
      const answer = createTestAnswer();
      const specialContent =
        "Test <script>alert('xss')</script> content with 'quotes' and \"double quotes\"";
      const updatedAnswer = answer.updateContent(specialContent);

      expect(updatedAnswer.content).toBe(specialContent);
    });

    it("should handle content with Unicode characters", () => {
      const answer = createTestAnswer();
      const unicodeContent =
        "Nội dung tiếng Việt với emoji 🎉 và ký tự đặc biệt ñ";
      const updatedAnswer = answer.updateContent(unicodeContent);

      expect(updatedAnswer.content).toBe(unicodeContent);
    });
  });

  describe("Method chaining", () => {
    it("should allow pin then updateContent", () => {
      const answer = createTestAnswer({
        isPinned: false,
        content: "Original",
      });

      const result = answer.pin().updateContent("Updated");

      expect(result.isPinned).toBe(true);
      expect(result.content).toBe("Updated");
    });

    it("should allow updateContent then pin then unpin", () => {
      const answer = createTestAnswer({
        isPinned: false,
        content: "Original",
      });

      const result = answer
        .updateContent("Step 1")
        .pin()
        .updateContent("Step 2")
        .unpin();

      expect(result.isPinned).toBe(false);
      expect(result.content).toBe("Step 2");
    });

    it("should preserve immutability through chain", () => {
      const original = createTestAnswer({
        isPinned: false,
        content: "Original",
      });

      const step1 = original.pin();
      const step2 = step1.updateContent("Updated");
      const step3 = step2.unpin();

      // All intermediate states should be preserved
      expect(original.isPinned).toBe(false);
      expect(original.content).toBe("Original");

      expect(step1.isPinned).toBe(true);
      expect(step1.content).toBe("Original");

      expect(step2.isPinned).toBe(true);
      expect(step2.content).toBe("Updated");

      expect(step3.isPinned).toBe(false);
      expect(step3.content).toBe("Updated");
    });
  });

  describe("Immutability", () => {
    it("should not modify original answer on pin", () => {
      const original = createTestAnswer({ isPinned: false });
      const pinned = original.pin();

      expect(original).not.toBe(pinned);
      expect(original.isPinned).toBe(false);
    });

    it("should not modify original answer on unpin", () => {
      const original = createPinnedAnswer();
      const unpinned = original.unpin();

      expect(original).not.toBe(unpinned);
      expect(original.isPinned).toBe(true);
    });

    it("should not modify original answer on updateContent", () => {
      const original = createTestAnswer({ content: "Original" });
      const updated = original.updateContent("Updated");

      expect(original).not.toBe(updated);
      expect(original.content).toBe("Original");
    });
  });

  describe("Edge Cases", () => {
    it("should handle answer with same content on update", () => {
      const answer = createTestAnswer({ content: "Same content" });
      const updated = answer.updateContent("Same content");

      expect(updated.content).toBe("Same content");
      expect(updated).not.toBe(answer); // Still creates new instance
    });

    it("should handle answer with whitespace content", () => {
      const answer = createTestAnswer();
      const updated = answer.updateContent("   ");

      expect(updated.content).toBe("   ");
    });

    it("should handle answer with multiline content", () => {
      const answer = createTestAnswer();
      const multilineContent = `Line 1
Line 2
Line 3`;
      const updated = answer.updateContent(multilineContent);

      expect(updated.content).toBe(multilineContent);
      expect(updated.content.split("\n").length).toBe(3);
    });
  });
});
