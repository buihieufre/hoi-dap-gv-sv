/**
 * Mock Repository Implementations for Testing
 */

import { User } from "@/domain/models/user.model";
import { Question } from "@/domain/models/question.model";
import { Answer } from "@/domain/models/answer.model";
import { IUserRepository } from "@/domain/repositories/user.repository";
import { IQuestionRepository } from "@/domain/repositories/question.repository";
import { IAnswerRepository } from "@/domain/repositories/answer.repository";
import { ICategoryRepository } from "@/domain/repositories/category.repository";
import { QuestionStatus } from "@/shared/types";

// ==================== Mock User Repository ====================
export class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  constructor(initialUsers: User[] = []) {
    this.users = initialUsers;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (
      this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ||
      null
    );
  }

  async findByStudentId(studentId: string): Promise<User | null> {
    return this.users.find((u) => u.studentId === studentId) || null;
  }

  async findByAdvisorId(advisorId: string): Promise<User | null> {
    return this.users.find((u) => u.advisorId === advisorId) || null;
  }

  async findAll(): Promise<User[]> {
    return [...this.users];
  }

  async create(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const user = new User(
      `user-${Date.now()}`,
      userData.email,
      userData.password,
      userData.fullName,
      userData.role,
      userData.studentId,
      userData.advisorId,
      new Date(),
      new Date()
    );
    this.users.push(user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error("User not found");
    }
    const user = this.users[index];
    const updatedUser = new User(
      user.id,
      data.email || user.email,
      data.password || user.password,
      data.fullName || user.fullName,
      data.role || user.role,
      data.studentId !== undefined ? data.studentId : user.studentId,
      data.advisorId !== undefined ? data.advisorId : user.advisorId,
      user.createdAt,
      new Date()
    );
    this.users[index] = updatedUser;
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      this.users.splice(index, 1);
    }
  }

  // Helper methods for testing
  reset(users: User[] = []): void {
    this.users = users;
  }

  getAll(): User[] {
    return [...this.users];
  }
}

// ==================== Mock Question Repository ====================
export class MockQuestionRepository implements IQuestionRepository {
  private questions: Question[] = [];

  constructor(initialQuestions: Question[] = []) {
    this.questions = initialQuestions;
  }

  async findById(id: string): Promise<Question | null> {
    return this.questions.find((q) => q.id === id) || null;
  }

  async findByAuthorId(authorId: string): Promise<Question[]> {
    return this.questions.filter((q) => q.authorId === authorId);
  }

  async findByCategoryId(categoryId: string): Promise<Question[]> {
    return this.questions.filter((q) => q.categoryId === categoryId);
  }

  async findByStatus(status: QuestionStatus): Promise<Question[]> {
    return this.questions.filter((q) => q.status === status);
  }

  async search(
    query: string,
    filters?: {
      categoryId?: string;
      tagIds?: string[];
      status?: QuestionStatus;
      authorId?: string;
    }
  ): Promise<Question[]> {
    let results = this.questions.filter(
      (q) =>
        q.title.toLowerCase().includes(query.toLowerCase()) ||
        q.content.toLowerCase().includes(query.toLowerCase())
    );

    if (filters?.categoryId) {
      results = results.filter((q) => q.categoryId === filters.categoryId);
    }
    if (filters?.status) {
      results = results.filter((q) => q.status === filters.status);
    }
    if (filters?.authorId) {
      results = results.filter((q) => q.authorId === filters.authorId);
    }

    return results;
  }

  async create(
    questionData: Omit<Question, "id" | "createdAt" | "updatedAt">
  ): Promise<Question> {
    const question = new Question(
      `question-${Date.now()}`,
      questionData.title,
      questionData.content,
      questionData.status,
      questionData.authorId,
      questionData.categoryId,
      questionData.views || 0,
      questionData.acceptedAnswerId,
      questionData.duplicateOfId,
      questionData.approvalStatus,
      questionData.isAnonymous,
      new Date(),
      new Date()
    );
    this.questions.push(question);
    return question;
  }

  async update(id: string, data: Partial<Question>): Promise<Question> {
    const index = this.questions.findIndex((q) => q.id === id);
    if (index === -1) {
      throw new Error("Question not found");
    }
    const question = this.questions[index];
    const updatedQuestion = new Question(
      question.id,
      data.title || question.title,
      data.content || question.content,
      data.status || question.status,
      data.authorId || question.authorId,
      data.categoryId || question.categoryId,
      data.views !== undefined ? data.views : question.views,
      data.acceptedAnswerId !== undefined
        ? data.acceptedAnswerId
        : question.acceptedAnswerId,
      data.duplicateOfId !== undefined
        ? data.duplicateOfId
        : question.duplicateOfId,
      data.approvalStatus !== undefined
        ? data.approvalStatus
        : question.approvalStatus,
      data.isAnonymous !== undefined ? data.isAnonymous : question.isAnonymous,
      question.createdAt,
      new Date()
    );
    this.questions[index] = updatedQuestion;
    return updatedQuestion;
  }

  async delete(id: string): Promise<void> {
    const index = this.questions.findIndex((q) => q.id === id);
    if (index !== -1) {
      this.questions.splice(index, 1);
    }
  }

  async incrementViews(id: string, userId: string): Promise<boolean> {
    const index = this.questions.findIndex((q) => q.id === id);
    if (index === -1) {
      return false;
    }
    const question = this.questions[index];
    this.questions[index] = question.incrementViews();
    return true;
  }

  // Helper methods for testing
  reset(questions: Question[] = []): void {
    this.questions = questions;
  }

  getAll(): Question[] {
    return [...this.questions];
  }
}

// ==================== Mock Answer Repository ====================
export class MockAnswerRepository implements IAnswerRepository {
  private answers: Answer[] = [];
  // Ensure unique IDs even when multiple answers are created quickly
  private idCounter = 0;

  constructor(initialAnswers: Answer[] = []) {
    this.answers = initialAnswers;
  }

  async findById(id: string): Promise<Answer | null> {
    return this.answers.find((a) => a.id === id) || null;
  }

  async findByQuestionId(questionId: string): Promise<Answer[]> {
    return this.answers.filter((a) => a.questionId === questionId);
  }

  async findByAuthorId(authorId: string): Promise<Answer[]> {
    return this.answers.filter((a) => a.authorId === authorId);
  }

  async create(
    answerData: Omit<Answer, "id" | "createdAt" | "updatedAt">
  ): Promise<Answer> {
    const id = `answer-${Date.now()}-${++this.idCounter}`;
    const answer = new Answer(
      id,
      answerData.content,
      answerData.authorId,
      answerData.questionId,
      answerData.isPinned || false,
      new Date(),
      new Date()
    );
    this.answers.push(answer);
    return answer;
  }

  async update(id: string, data: Partial<Answer>): Promise<Answer> {
    const index = this.answers.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error("Answer not found");
    }
    const answer = this.answers[index];
    const updatedAnswer = new Answer(
      answer.id,
      data.content || answer.content,
      data.authorId || answer.authorId,
      data.questionId || answer.questionId,
      data.isPinned !== undefined ? data.isPinned : answer.isPinned,
      answer.createdAt,
      new Date()
    );
    this.answers[index] = updatedAnswer;
    return updatedAnswer;
  }

  async delete(id: string): Promise<void> {
    const index = this.answers.findIndex((a) => a.id === id);
    if (index !== -1) {
      this.answers.splice(index, 1);
    }
  }

  // Helper methods for testing
  reset(answers: Answer[] = []): void {
    this.answers = answers;
    this.idCounter = 0;
  }

  getAll(): Answer[] {
    return [...this.answers];
  }
}

// ==================== Mock Category Repository ====================
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
}

export class MockCategoryRepository implements ICategoryRepository {
  private categories: Category[] = [];

  constructor(initialCategories: Category[] = []) {
    this.categories = initialCategories;
  }

  async findById(id: string): Promise<Category | null> {
    return this.categories.find((c) => c.id === id) || null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categories.find((c) => c.slug === slug) || null;
  }

  async findAll(): Promise<Category[]> {
    return [...this.categories];
  }

  async create(categoryData: Omit<Category, "id">): Promise<Category> {
    const category: Category = {
      id: `category-${Date.now()}`,
      ...categoryData,
    };
    this.categories.push(category);
    return category;
  }

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Category not found");
    }
    this.categories[index] = { ...this.categories[index], ...data };
    return this.categories[index];
  }

  async delete(id: string): Promise<void> {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.categories.splice(index, 1);
    }
  }

  // Helper methods for testing
  reset(categories: Category[] = []): void {
    this.categories = categories;
  }

  getAll(): Category[] {
    return [...this.categories];
  }
}
