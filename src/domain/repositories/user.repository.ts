/**
 * User Repository Interface
 */

import { User } from "../models/user.model";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByStudentId(studentId: string): Promise<User | null>;
  findByAdvisorId(advisorId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}
