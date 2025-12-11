/**
 * Get Profile Use Case
 */

import { IUserRepository } from "@/domain/repositories/user.repository";
import { User } from "@/domain/models/user.model";
import { NotFoundError } from "@/usecase/errors/app-error";

export class GetProfileUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }
}
