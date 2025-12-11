/**
 * Question Repository Interface
 */

import { Question } from "../models/question.model";
import { QuestionStatus } from "@/shared/types";

export interface IQuestionRepository {
  findById(id: string): Promise<Question | null>;
  findByAuthorId(authorId: string): Promise<Question[]>;
  findByCategoryId(categoryId: string): Promise<Question[]>;
  findByStatus(status: QuestionStatus): Promise<Question[]>;
  search(
    query: string,
    filters?: {
      categoryId?: string;
      tagIds?: string[];
      status?: QuestionStatus;
      authorId?: string;
    }
  ): Promise<Question[]>;
  create(
    question: Omit<Question, "id" | "createdAt" | "updatedAt">
  ): Promise<Question>;
  update(id: string, data: Partial<Question>): Promise<Question>;
  delete(id: string): Promise<void>;
  incrementViews(id: string, userId: string): Promise<boolean>;
}
