/**
 * User Domain Model
 */

import { UserRole } from "@/shared/types";

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly fullName: string,
    public readonly role: UserRole,
    public readonly studentId?: string | null,
    public readonly advisorId?: string | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  canCreateQuestion(): boolean {
    return (
      this.role === "STUDENT" ||
      this.role === "ADVISOR" ||
      this.role === "ADMIN"
    );
  }

  canAnswerQuestion(): boolean {
    return this.role === "ADVISOR" || this.role === "ADMIN";
  }

  canManageUsers(): boolean {
    return this.role === "ADMIN";
  }

  canCloseQuestion(): boolean {
    return this.role === "ADVISOR" || this.role === "ADMIN";
  }
}
