/**
 * Update Question Use Case
 */

import { IQuestionRepository } from "@/domain/repositories/question.repository";
import { IUserRepository } from "@/domain/repositories/user.repository";
import { Question } from "@/domain/models/question.model";
import { NotFoundError, ForbiddenError, ValidationError } from "@/usecase/errors/app-error";

export interface UpdateQuestionRequest {
  questionId: string;
  userId: string;
  title?: string;
  content?: string;
  categoryId?: string;
  status?: string;
}

export class UpdateQuestionUseCase {
  constructor(
    private questionRepository: IQuestionRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(request: UpdateQuestionRequest): Promise<Question> {
    // Find question
    const question = await this.questionRepository.findById(request.questionId);
    if (!question) {
      throw new NotFoundError("Question not found");
    }

    // Check permissions
    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Only author or admin can update
    if (question.authorId !== request.userId && !user.canManageUsers()) {
      throw new ForbiddenError("You don't have permission to update this question");
    }

    // Validate status change
    if (request.status && request.status === "CLOSED" && !user.canCloseQuestion()) {
      throw new ForbiddenError("You don't have permission to close questions");
    }

    // Update question
    const updatedQuestion = await this.questionRepository.update(request.questionId, {
      title: request.title?.trim(),
      content: request.content?.trim(),
      categoryId: request.categoryId,
      status: request.status as any,
    });

    return updatedQuestion;
  }
}

