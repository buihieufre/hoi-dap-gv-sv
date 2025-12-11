/**
 * Create Answer Use Case
 */

import { IAnswerRepository } from "@/domain/repositories/answer.repository";
import { IQuestionRepository } from "@/domain/repositories/question.repository";
import { IUserRepository } from "@/domain/repositories/user.repository";
import { Answer } from "@/domain/models/answer.model";
import { ValidationError, ForbiddenError, NotFoundError } from "@/usecase/errors/app-error";

export interface CreateAnswerRequest {
  questionId: string;
  content: string;
  authorId: string;
}

export class CreateAnswerUseCase {
  constructor(
    private answerRepository: IAnswerRepository,
    private questionRepository: IQuestionRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(request: CreateAnswerRequest): Promise<Answer> {
    // Validate input
    if (!request.content || request.content.trim().length === 0) {
      throw new ValidationError("Content is required");
    }

    // Check if question exists
    const question = await this.questionRepository.findById(request.questionId);
    if (!question) {
      throw new NotFoundError("Question not found");
    }

    // Check if question can be answered
    if (!question.canBeAnswered()) {
      throw new ValidationError("Question cannot be answered");
    }

    // Check if user exists and can answer
    const user = await this.userRepository.findById(request.authorId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.canAnswerQuestion()) {
      throw new ForbiddenError("User cannot answer questions");
    }

    // Create answer
    const answer = await this.answerRepository.create({
      content: request.content.trim(),
      authorId: request.authorId,
      questionId: request.questionId,
      isPinned: false,
    });

    // Update question status to ANSWERED if it was OPEN
    if (question.status === "OPEN") {
      await this.questionRepository.update(request.questionId, {
        status: "ANSWERED",
      });
    }

    return answer;
  }
}

