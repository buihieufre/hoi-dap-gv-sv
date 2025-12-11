/**
 * Auth Middleware
 * Middleware để check authentication cho API routes
 */

import { NextRequest } from "next/server";
import { getTokenFromCookies, verifyToken } from "@/infrastructure/config/auth";
import { UnauthorizedError } from "@/usecase/errors/app-error";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Get authenticated user from request
 */
export function getAuthUser(request: NextRequest): {
  userId: string;
  email: string;
  role: string;
} {
  const cookies = request.headers.get("cookie") || "";
  const token = getTokenFromCookies(cookies);

  if (!token) {
    throw new UnauthorizedError("No authentication token");
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

/**
 * Require authentication (any role). Throws UnauthorizedError if invalid.
 */
export function requireAuth(request: NextRequest): void {
  getAuthUser(request);
}

/**
 * Require specific role
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): void {
  const user = getAuthUser(request);

  if (!allowedRoles.includes(user.role)) {
    throw new UnauthorizedError("Insufficient permissions");
  }
}
