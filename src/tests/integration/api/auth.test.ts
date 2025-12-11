/**
 * Integration Tests for Auth API Routes
 * Tests the complete auth flow including database interactions
 */

import { NextRequest } from "next/server";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { GET as meHandler } from "@/app/api/auth/me/route";

// Mock Prisma
jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock JWT and cookie helper
jest.mock("@/infrastructure/config/auth", () => ({
  generateToken: jest.fn().mockReturnValue("mock-jwt-token"),
  verifyToken: jest.fn(),
  getTokenFromCookies: jest.fn().mockImplementation((cookies: string) => {
    const tokenCookie = cookies
      ?.split("; ")
      .find((c) => c.startsWith("auth_token="));
    return tokenCookie ? tokenCookie.split("=")[1] : null;
  }),
}));

import { prisma } from "@/infrastructure/database/prisma";
import bcrypt from "bcryptjs";
import {
  generateToken,
  verifyToken,
  getTokenFromCookies,
} from "@/infrastructure/config/auth";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockGenerateToken = generateToken as jest.MockedFunction<
  typeof generateToken
>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockGetTokenFromCookies = getTokenFromCookies as jest.MockedFunction<
  typeof getTokenFromCookies
>;

describe("Auth API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      password: "$2a$10$hashedpassword",
      fullName: "Test User",
      role: "STUDENT",
      studentId: "SV001",
      advisorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should return 400 when email is missing", async () => {
      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 400 when password is missing", async () => {
      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 401 when user not found", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "password123",
        }),
      });

      const response = await loginHandler(request);

      expect(response.status).toBe(401);
    });

    it("should return 401 when password is incorrect", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      const response = await loginHandler(request);

      expect(response.status).toBe(401);
    });

    it("should return 200 with user data and token on successful login", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "correct-password",
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("test@example.com");
      expect(data.user.fullName).toBe("Test User");
      expect(data.token).toBe("mock-jwt-token");
      // Password should not be returned
      expect(data.user.password).toBeUndefined();
    });

    it("should set auth_token cookie on successful login", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "correct-password",
        }),
      });

      const response = await loginHandler(request);

      const cookieHeader = response.headers.get("set-cookie");
      expect(cookieHeader).toContain("auth_token=");
    });
  });

  describe("POST /api/auth/register", () => {
    beforeEach(() => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue("$2a$10$hashedpassword");
    });

    it("should return 400 for invalid email format", async () => {
      const request = new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          password: "password123",
          fullName: "Test User",
          role: "STUDENT",
        }),
      });

      const response = await registerHandler(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for short password", async () => {
      const request = new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "12345", // Less than 6 characters
          fullName: "Test User",
          role: "STUDENT",
        }),
      });

      const response = await registerHandler(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for duplicate email", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      });

      const request = new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          fullName: "Test User",
          role: "STUDENT",
        }),
      });

      const response = await registerHandler(request);

      expect(response.status).toBe(400);
    });

    it("should create user and return 201 on success", async () => {
      const newUser = {
        id: "new-user-id",
        email: "newuser@example.com",
        fullName: "New User",
        role: "STUDENT",
        studentId: "SV001",
        advisorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(newUser);

      const request = new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "password123",
          fullName: "New User",
          role: "STUDENT",
          studentId: "SV001",
        }),
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("newuser@example.com");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear auth_token cookie and return 200", async () => {
      const request = new NextRequest("http://localhost/api/auth/logout", {
        method: "POST",
      });

      const response = await logoutHandler();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();

      const cookieHeader = response.headers.get("set-cookie");
      expect(cookieHeader).toContain("auth_token=");
      // Cookie should be expired (max-age=0 or expires in past)
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 when no auth token provided", async () => {
      const request = new NextRequest("http://localhost/api/auth/me", {
        method: "GET",
      });

      const response = await meHandler(request);

      expect(response.status).toBe(401);
    });

    it("should return 401 for invalid token", async () => {
      (mockVerifyToken as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const request = new NextRequest("http://localhost/api/auth/me", {
        method: "GET",
        headers: {
          Cookie: "auth_token=invalid-token",
        },
      });

      const response = await meHandler(request);

      expect(response.status).toBe(401);
    });

    it("should return user data for valid token", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        fullName: "Test User",
        role: "STUDENT",
        studentId: "SV001",
        advisorId: null,
      };

      (mockVerifyToken as jest.Mock).mockReturnValue({
        userId: "user-1",
        email: "test@example.com",
        role: "STUDENT",
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost/api/auth/me", {
        method: "GET",
        headers: {
          Cookie: "auth_token=valid-token",
        },
      });

      const response = await meHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.email).toBe("test@example.com");
      expect(data.fullName).toBe("Test User");
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await loginHandler(request);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it("should handle JSON parse errors", async () => {
      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: "invalid-json",
      });

      const response = await loginHandler(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
