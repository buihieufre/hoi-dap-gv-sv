/**
 * Authentication Configuration
 */

import jwt from "jsonwebtoken";
// Using process.env directly
import { UserRole } from "@/shared/types";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  const jwtSecret =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";
  return jwt.sign(payload, jwtSecret, {
    expiresIn: "7d", // Token expires in 7 days
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const jwtSecret =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get token from request headers
 */
export function getTokenFromRequest(headers: Headers): string | null {
  const authHeader = headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Get token from cookies
 */
export function getTokenFromCookies(cookies: string): string | null {
  const cookieArray = cookies.split("; ");
  const tokenCookie = cookieArray.find((cookie) =>
    cookie.startsWith("auth_token=")
  );
  if (tokenCookie) {
    return tokenCookie.split("=")[1];
  }
  return null;
}
