/**
 * Update Answer Use Case
 */

import { IAnswerRepository } from "@/domain/repositories/answer.repository";
import { IUserRepository } from "@/domain/repositories/user.repository";
import { Answer } from "@/domain/models/answer.model";
import { NotFoundError, ForbiddenError, ValidationError } from "@/usecase/errors/app-error";

export interface UpdateAnswerRequest {
  answerId: string;
  userId: string;
  content?: string;
  isPinned?: boolean;
}

export class UpdateAnswerUseCase {
  constructor(
    private answerRepository: IAnswerRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(request: UpdateAnswerRequest): Promise<Answer> {
    // Find answer
    const answer = await this.answerRepository.findById(request.answerId);
    if (!answer) {
      throw new NotFoundError("Answer not found");
    }

    // Check permissions
    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Only author or admin can update content
    if (request.content && answer.authorId !== request.userId && !user.canManageUsers()) {
      throw new ForbiddenError("You don't have permission to update this answer");
    }

    // Only advisor/admin can pin/unpin
    if (request.isPinned !== undefined && !user.canAnswerQuestion()) {
      throw new ForbiddenError("You don't have permission to pin answers");
    }

    // Validate content if provided
    if (request.content && request.content.trim().length === 0) {
      throw new ValidationError("Content cannot be empty");
    }

    // Update answer
    const updatedAnswer = await this.answerRepository.update(request.answerId, {
      content: request.content?.trim(),
      isPinned: request.isPinned,
    });

    return updatedAnswer;
  }
}

