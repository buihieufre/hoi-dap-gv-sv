/**
 * Create Question Use Case
 */

import { IQuestionRepository } from "@/domain/repositories/question.repository";
import { IUserRepository } from "@/domain/repositories/user.repository";
import { ICategoryRepository } from "@/domain/repositories/category.repository";
import { Question } from "@/domain/models/question.model";
import { ApprovalStatus } from "@/shared/types";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "@/usecase/errors/app-error";

export interface CreateQuestionRequest {
  title: string;
  content: string;
  categoryId: string; // Primary category (backward compatibility)
  categoryIds?: string[]; // All categories (for many-to-many)
  tagIds?: string[];
  authorId: string;
  isAnonymous?: boolean; // Đặt câu hỏi ẩn danh (sinh viên không thấy tên, nhưng CVHT/Admin vẫn thấy)
}

export class CreateQuestionUseCase {
  constructor(
    private questionRepository: IQuestionRepository,
    private userRepository: IUserRepository,
    private categoryRepository: ICategoryRepository
  ) {}

  async execute(request: CreateQuestionRequest): Promise<Question> {
    // Validate input
    if (!request.title || request.title.trim().length === 0) {
      throw new ValidationError("Title is required");
    }

    if (!request.content || request.content.trim().length === 0) {
      throw new ValidationError("Content is required");
    }

    // Support both single categoryId and multiple categoryIds
    const categoryIds =
      request.categoryIds && request.categoryIds.length > 0
        ? request.categoryIds
        : request.categoryId
        ? [request.categoryId]
        : [];

    if (categoryIds.length === 0) {
      throw new ValidationError("At least one category is required");
    }

    // Check if all categories exist
    for (const catId of categoryIds) {
      const category = await this.categoryRepository.findById(catId);
      if (!category) {
        throw new NotFoundError(`Category ${catId} not found`);
      }
    }

    // Check if user exists and can create questions
    const user = await this.userRepository.findById(request.authorId);
    if (!user) {
      throw new ValidationError("User not found");
    }

    if (!user.canCreateQuestion()) {
      throw new ForbiddenError("User cannot create questions");
    }

    // Set approval status based on user role
    // STUDENT needs approval, ADVISOR and ADMIN are auto-approved
    const approvalStatus: ApprovalStatus =
      user.role === "STUDENT" ? "PENDING" : "APPROVED";

    // Create question
    const question = await this.questionRepository.create({
      title: request.title.trim(),
      content: request.content.trim(),
      status: "OPEN",
      approvalStatus: approvalStatus,
      authorId: request.authorId,
      categoryId: request.categoryId,
      views: 0,
      isAnonymous: request.isAnonymous || false,
    });

    // Create QuestionCategory records for all categories (many-to-many)
    if (categoryIds.length > 0) {
      const { prisma } = await import("@/infrastructure/database/prisma");
      await prisma.questionCategory.createMany({
        data: categoryIds.map((catId) => ({
          questionId: question.id,
          categoryId: catId,
        })),
        skipDuplicates: true, // Skip if already exists
      });
    }

    return question;
  }
}
