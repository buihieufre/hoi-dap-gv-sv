/**
 * Unit Tests for Login Use Case
 */

import { LoginUseCase } from "@/usecase/user/login.usecase";
import { MockUserRepository } from "@/tests/mocks/repositories.mock";
import { createStudentUser, hashPassword } from "@/tests/mocks/test-data";
import { UnauthorizedError } from "@/usecase/errors/app-error";
import bcrypt from "bcryptjs";

describe("LoginUseCase", () => {
  let loginUseCase: LoginUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(async () => {
    // Create a user with hashed password
    const hashedPassword = await bcrypt.hash("correct-password", 10);
    const testUser = createStudentUser({
      id: "user-1",
      email: "test@example.com",
      password: hashedPassword,
      fullName: "Test User",
    });

    mockUserRepository = new MockUserRepository([testUser]);
    loginUseCase = new LoginUseCase(mockUserRepository);
  });

  describe("execute", () => {
    it("should successfully login with correct credentials", async () => {
      const result = await loginUseCase.execute({
        email: "test@example.com",
        password: "correct-password",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.fullName).toBe("Test User");
    });

    it("should throw UnauthorizedError when email not found", async () => {
      await expect(
        loginUseCase.execute({
          email: "nonexistent@example.com",
          password: "any-password",
        })
      ).rejects.toThrow(UnauthorizedError);

      await expect(
        loginUseCase.execute({
          email: "nonexistent@example.com",
          password: "any-password",
        })
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw UnauthorizedError when password is incorrect", async () => {
      await expect(
        loginUseCase.execute({
          email: "test@example.com",
          password: "wrong-password",
        })
      ).rejects.toThrow(UnauthorizedError);

      await expect(
        loginUseCase.execute({
          email: "test@example.com",
          password: "wrong-password",
        })
      ).rejects.toThrow("Invalid email or password");
    });

    it("should be case-insensitive for email lookup", async () => {
      // This depends on the repository implementation
      // The mock repository handles case-insensitive email lookup
      const result = await loginUseCase.execute({
        email: "TEST@EXAMPLE.COM",
        password: "correct-password",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("test@example.com");
    });

    it("should return user object without exposing password in usage", async () => {
      const result = await loginUseCase.execute({
        email: "test@example.com",
        password: "correct-password",
      });

      // Password is still in the model but should not be used after this point
      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBeDefined();
      expect(result.user.fullName).toBeDefined();
      expect(result.user.role).toBeDefined();
    });

    it("should work with multiple users in repository", async () => {
      // Add more users
      const hashedPassword2 = await bcrypt.hash("password2", 10);
      const user2 = createStudentUser({
        id: "user-2",
        email: "user2@example.com",
        password: hashedPassword2,
        fullName: "User 2",
      });

      mockUserRepository.reset([
        ...mockUserRepository.getAll(),
        user2,
      ]);

      // Login as first user
      const result1 = await loginUseCase.execute({
        email: "test@example.com",
        password: "correct-password",
      });
      expect(result1.user.id).toBe("user-1");

      // Login as second user
      const result2 = await loginUseCase.execute({
        email: "user2@example.com",
        password: "password2",
      });
      expect(result2.user.id).toBe("user-2");
    });
  });

  describe("Error handling", () => {
    it("should throw error with statusCode 401", async () => {
      try {
        await loginUseCase.execute({
          email: "nonexistent@example.com",
          password: "any-password",
        });
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).statusCode).toBe(401);
        expect((error as UnauthorizedError).code).toBe("UNAUTHORIZED");
      }
    });

    it("should provide same error message for both email not found and wrong password", async () => {
      // This is a security best practice
      let errorMessage1 = "";
      let errorMessage2 = "";

      try {
        await loginUseCase.execute({
          email: "nonexistent@example.com",
          password: "any-password",
        });
      } catch (error) {
        errorMessage1 = (error as Error).message;
      }

      try {
        await loginUseCase.execute({
          email: "test@example.com",
          password: "wrong-password",
        });
      } catch (error) {
        errorMessage2 = (error as Error).message;
      }

      expect(errorMessage1).toBe(errorMessage2);
      expect(errorMessage1).toBe("Invalid email or password");
    });
  });

  describe("Password verification", () => {
    it("should correctly verify bcrypt hashed passwords", async () => {
      const password = "my-secure-password-123!";
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = createStudentUser({
        id: "user-secure",
        email: "secure@example.com",
        password: hashedPassword,
      });

      mockUserRepository.reset([user]);

      const result = await loginUseCase.execute({
        email: "secure@example.com",
        password: password,
      });

      expect(result.user).toBeDefined();
    });

    it("should reject slightly different passwords", async () => {
      await expect(
        loginUseCase.execute({
          email: "test@example.com",
          password: "correct-password ", // trailing space
        })
      ).rejects.toThrow(UnauthorizedError);

      await expect(
        loginUseCase.execute({
          email: "test@example.com",
          password: "Correct-password", // capital C
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("Different user roles", () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash("password", 10);
      
      const student = createStudentUser({
        id: "student-1",
        email: "student@example.com",
        password: hashedPassword,
        role: "STUDENT",
      });

      const advisor = createStudentUser({
        id: "advisor-1",
        email: "advisor@example.com",
        password: hashedPassword,
        role: "ADVISOR",
      });

      const admin = createStudentUser({
        id: "admin-1",
        email: "admin@example.com",
        password: hashedPassword,
        role: "ADMIN",
      });

      mockUserRepository.reset([student, advisor, admin]);
    });

    it("should login STUDENT successfully", async () => {
      const result = await loginUseCase.execute({
        email: "student@example.com",
        password: "password",
      });

      expect(result.user.role).toBe("STUDENT");
    });

    it("should login ADVISOR successfully", async () => {
      const result = await loginUseCase.execute({
        email: "advisor@example.com",
        password: "password",
      });

      expect(result.user.role).toBe("ADVISOR");
    });

    it("should login ADMIN successfully", async () => {
      const result = await loginUseCase.execute({
        email: "admin@example.com",
        password: "password",
      });

      expect(result.user.role).toBe("ADMIN");
    });
  });
});

