/**
 * Login Use Case
 */

import { IUserRepository } from "@/domain/repositories/user.repository";
import { User } from "@/domain/models/user.model";
import { UnauthorizedError } from "@/usecase/errors/app-error";
import bcrypt from "bcryptjs";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export class LoginUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(request.email);

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      request.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    return {
      user,
    };
  }
}
