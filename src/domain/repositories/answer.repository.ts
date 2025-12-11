/**
 * Answer Repository Interface
 */

import { Answer } from "../models/answer.model";

export interface IAnswerRepository {
  findById(id: string): Promise<Answer | null>;
  findByQuestionId(questionId: string): Promise<Answer[]>;
  findByAuthorId(authorId: string): Promise<Answer[]>;
  create(
    answer: Omit<Answer, "id" | "createdAt" | "updatedAt">
  ): Promise<Answer>;
  update(id: string, data: Partial<Answer>): Promise<Answer>;
  delete(id: string): Promise<void>;
}
