/**
 * Delete Answer Use Case
 */

import { IAnswerRepository } from "@/domain/repositories/answer.repository";
import { IUserRepository } from "@/domain/repositories/user.repository";
import { NotFoundError, ForbiddenError } from "@/usecase/errors/app-error";

export interface DeleteAnswerRequest {
  answerId: string;
  userId: string;
}

export class DeleteAnswerUseCase {
  constructor(
    private answerRepository: IAnswerRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(request: DeleteAnswerRequest): Promise<void> {
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

    // Only author or admin can delete
    if (answer.authorId !== request.userId && !user.canManageUsers()) {
      throw new ForbiddenError("You don't have permission to delete this answer");
    }

    // Delete answer
    await this.answerRepository.delete(request.answerId);
  }
}

