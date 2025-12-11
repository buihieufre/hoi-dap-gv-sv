/**
 * Get Question Use Case
 */

import { IQuestionRepository } from "@/domain/repositories/question.repository";
import { Question } from "@/domain/models/question.model";
import { NotFoundError } from "@/usecase/errors/app-error";

export class GetQuestionUseCase {
  constructor(private questionRepository: IQuestionRepository) {}

  async execute(questionId: string): Promise<Question> {
    const question = await this.questionRepository.findById(questionId);

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    // Views are now handled separately via /api/questions/[id]/view endpoint
    return question;
  }
}
