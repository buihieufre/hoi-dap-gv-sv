/**
 * Auth Utilities
 * Helper functions for authentication and authorization
 */

import { UserRole } from "@/shared/types";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Check if user has required role
 */
export function hasRole(
  user: AuthUser | null,
  requiredRole: UserRole
): boolean {
  if (!user) return false;

  // Admin has access to everything
  if (user.role === "ADMIN") return true;

  return user.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(
  user: AuthUser | null,
  requiredRoles: UserRole[]
): boolean {
  if (!user) return false;

  // Admin has access to everything
  if (user.role === "ADMIN") return true;

  return requiredRoles.includes(user.role);
}

/**
 * Check if user can perform action
 */
export function canPerformAction(
  user: AuthUser | null,
  action:
    | "create_question"
    | "answer_question"
    | "manage_users"
    | "close_question"
): boolean {
  if (!user) return false;

  switch (action) {
    case "create_question":
      return ["STUDENT", "ADVISOR", "ADMIN"].includes(user.role);
    case "answer_question":
      return ["ADVISOR", "ADMIN"].includes(user.role);
    case "manage_users":
      return user.role === "ADMIN";
    case "close_question":
      return ["ADVISOR", "ADMIN"].includes(user.role);
    default:
      return false;
  }
}
