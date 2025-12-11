/**
 * Question Domain Model
 */

import { QuestionStatus, ApprovalStatus } from "@/shared/types";

export class Question {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly content: string,
    public readonly status: QuestionStatus,
    public readonly authorId: string,
    public readonly categoryId: string,
    public readonly views: number = 0,
    public readonly acceptedAnswerId?: string | null,
    public readonly duplicateOfId?: string | null,
    public readonly approvalStatus?: ApprovalStatus,
    public readonly isAnonymous: boolean = false, // Đặt câu hỏi ẩn danh
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  canBeAnswered(): boolean {
    return this.status === "OPEN" || this.status === "ANSWERED";
  }

  canBeClosed(): boolean {
    return this.status === "OPEN" || this.status === "ANSWERED";
  }

  markAsAnswered(answerId: string): Question {
    return new Question(
      this.id,
      this.title,
      this.content,
      "ANSWERED",
      this.authorId,
      this.categoryId,
      this.views,
      answerId,
      this.duplicateOfId,
      this.approvalStatus,
      this.isAnonymous,
      this.createdAt,
      this.updatedAt
    );
  }

  markAsClosed(): Question {
    return new Question(
      this.id,
      this.title,
      this.content,
      "CLOSED",
      this.authorId,
      this.categoryId,
      this.views,
      this.acceptedAnswerId,
      this.duplicateOfId,
      this.approvalStatus,
      this.isAnonymous,
      this.createdAt,
      this.updatedAt
    );
  }

  incrementViews(): Question {
    return new Question(
      this.id,
      this.title,
      this.content,
      this.status,
      this.authorId,
      this.categoryId,
      this.views + 1,
      this.acceptedAnswerId,
      this.duplicateOfId,
      this.approvalStatus,
      this.isAnonymous,
      this.createdAt,
      this.updatedAt
    );
  }
}
