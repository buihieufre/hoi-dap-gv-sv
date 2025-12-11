/**
 * Search Questions Use Case
 */

import { IQuestionRepository } from "@/domain/repositories/question.repository";
import { Question } from "@/domain/models/question.model";
import { QuestionStatus } from "@/shared/types";

export interface SearchQuestionsRequest {
  query?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: QuestionStatus;
  authorId?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "views" | "votes";
  order?: "asc" | "desc";
}

export interface SearchQuestionsResponse {
  questions: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SearchQuestionsUseCase {
  constructor(private questionRepository: IQuestionRepository) {}

  async execute(
    request: SearchQuestionsRequest
  ): Promise<SearchQuestionsResponse> {
    const page = request.page || 1;
    const limit = request.limit || 10;

    // Build filters
    const filters = {
      categoryId: request.categoryId,
      tagIds: request.tagIds,
      status: request.status,
      authorId: request.authorId,
    };

    // Search questions
    const questions = await this.questionRepository.search(
      request.query || "",
      filters
    );

    // TODO: Implement pagination and sorting in repository
    // For now, return all results
    const total = questions.length;
    const totalPages = Math.ceil(total / limit);

    return {
      questions,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
