/**
 * Register Use Case
 */

import { IUserRepository } from "@/domain/repositories/user.repository";
import { User } from "@/domain/models/user.model";
import { ValidationError } from "@/usecase/errors/app-error";
import { UserRole } from "@/shared/types";
import bcrypt from "bcryptjs";

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  studentId?: string;
  advisorId?: string;
}

export interface RegisterResponse {
  user: User;
}

export class RegisterUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(request: RegisterRequest): Promise<RegisterResponse> {
    // Normalize inputs upfront
    const email = request.email?.trim().toLowerCase();
    const fullName = request.fullName?.trim();
    const studentId = request.studentId?.trim() || null;
    const advisorId = request.advisorId?.trim() || null;

    // Validate email format
    if (!email || !this.isValidEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    // Validate password strength
    if (request.password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ValidationError("Email already registered");
    }

    // Check studentId/advisorId uniqueness if provided
    if (studentId) {
      const existingStudent = await this.userRepository.findByStudentId(
        studentId
      );
      if (existingStudent) {
        throw new ValidationError("Student ID already registered");
      }
    }

    if (advisorId) {
      const existingAdvisor = await this.userRepository.findByAdvisorId(
        advisorId
      );
      if (existingAdvisor) {
        throw new ValidationError("Advisor ID already registered");
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(request.password, 10);

    // Create user
    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
      fullName,
      role: request.role,
      studentId,
      advisorId,
      canCreateQuestion: () => true,
      canAnswerQuestion: () => true,
      canManageUsers: () => false,
      canCloseQuestion: () => false,
    });

    return {
      user,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
