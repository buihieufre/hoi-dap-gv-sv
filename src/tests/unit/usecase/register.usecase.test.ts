/**
 * Unit Tests for Register Use Case
 */

import { RegisterUseCase } from "@/usecase/user/register.usecase";
import { MockUserRepository } from "@/tests/mocks/repositories.mock";
import { createStudentUser } from "@/tests/mocks/test-data";
import { ValidationError } from "@/usecase/errors/app-error";

describe("RegisterUseCase", () => {
  let registerUseCase: RegisterUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository([]);
    registerUseCase = new RegisterUseCase(mockUserRepository);
  });

  describe("Successful Registration", () => {
    it("should register a new student successfully", async () => {
      const result = await registerUseCase.execute({
        email: "newstudent@example.com",
        password: "password123",
        fullName: "New Student",
        role: "STUDENT",
        studentId: "SV001",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("newstudent@example.com");
      expect(result.user.fullName).toBe("New Student");
      expect(result.user.role).toBe("STUDENT");
      expect(result.user.studentId).toBe("SV001");
    });

    it("should register a new advisor successfully", async () => {
      const result = await registerUseCase.execute({
        email: "newadvisor@example.com",
        password: "password123",
        fullName: "New Advisor",
        role: "ADVISOR",
        advisorId: "GV001",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("newadvisor@example.com");
      expect(result.user.role).toBe("ADVISOR");
      expect(result.user.advisorId).toBe("GV001");
    });

    it("should register without studentId or advisorId", async () => {
      const result = await registerUseCase.execute({
        email: "user@example.com",
        password: "password123",
        fullName: "User",
        role: "ADMIN",
      });

      expect(result.user).toBeDefined();
      expect(result.user.studentId).toBeNull();
      expect(result.user.advisorId).toBeNull();
    });

    it("should hash the password", async () => {
      const result = await registerUseCase.execute({
        email: "test@example.com",
        password: "plain-password",
        fullName: "Test User",
        role: "STUDENT",
      });

      // Password should be hashed, not plain text
      expect(result.user.password).not.toBe("plain-password");
      expect(result.user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    it("should normalize email to lowercase", async () => {
      const result = await registerUseCase.execute({
        email: "TEST@EXAMPLE.COM",
        password: "password123",
        fullName: "Test User",
        role: "STUDENT",
      });

      expect(result.user.email).toBe("test@example.com");
    });

    it("should trim whitespace from inputs", async () => {
      const result = await registerUseCase.execute({
        email: "  test@example.com  ",
        password: "password123",
        fullName: "  Test User  ",
        role: "STUDENT",
        studentId: "  SV001  ",
      });

      expect(result.user.email).toBe("test@example.com");
      expect(result.user.fullName).toBe("Test User");
      expect(result.user.studentId).toBe("SV001");
    });
  });

  describe("Email Validation", () => {
    it("should throw ValidationError for invalid email format", async () => {
      await expect(
        registerUseCase.execute({
          email: "invalid-email",
          password: "password123",
          fullName: "Test User",
          role: "STUDENT",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        registerUseCase.execute({
          email: "invalid-email",
          password: "password123",
          fullName: "Test User",
          role: "STUDENT",
        })
      ).rejects.toThrow("Invalid email format");
    });

    it("should accept valid email formats", async () => {
      const validEmails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.com",
        "user@subdomain.example.com",
      ];

      for (const email of validEmails) {
        mockUserRepository.reset([]);
        const result = await registerUseCase.execute({
          email,
          password: "password123",
          fullName: "Test User",
          role: "STUDENT",
        });
        expect(result.user.email).toBe(email.toLowerCase());
      }
    });

    it("should reject emails without @ symbol", async () => {
      await expect(
        registerUseCase.execute({
          email: "userexample.com",
          password: "password123",
          fullName: "Test User",
          role: "STUDENT",
        })
      ).rejects.toThrow("Invalid email format");
    });

    it("should reject emails without domain", async () => {
      await expect(
        registerUseCase.execute({
          email: "user@",
          password: "password123",
          fullName: "Test User",
          role: "STUDENT",
        })
      ).rejects.toThrow("Invalid email format");
    });
  });

  describe("Password Validation", () => {
    it("should throw ValidationError for password less than 6 characters", async () => {
      await expect(
        registerUseCase.execute({
          email: "test@example.com",
          password: "12345",
          fullName: "Test User",
          role: "STUDENT",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        registerUseCase.execute({
          email: "test@example.com",
          password: "12345",
          fullName: "Test User",
          role: "STUDENT",
        })
      ).rejects.toThrow("Password must be at least 6 characters");
    });

    it("should accept password with exactly 6 characters", async () => {
      const result = await registerUseCase.execute({
        email: "test@example.com",
        password: "123456",
        fullName: "Test User",
        role: "STUDENT",
      });

      expect(result.user).toBeDefined();
    });

    it("should accept long passwords", async () => {
      const result = await registerUseCase.execute({
        email: "test@example.com",
        password: "a".repeat(100),
        fullName: "Test User",
        role: "STUDENT",
      });

      expect(result.user).toBeDefined();
    });
  });

  describe("Duplicate Validation", () => {
    beforeEach(() => {
      const existingUser = createStudentUser({
        id: "existing-user",
        email: "existing@example.com",
        studentId: "SV001",
        advisorId: null,
      });
      mockUserRepository.reset([existingUser]);
    });

    it("should throw ValidationError for duplicate email", async () => {
      await expect(
        registerUseCase.execute({
          email: "existing@example.com",
          password: "password123",
          fullName: "New User",
          role: "STUDENT",
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        registerUseCase.execute({
          email: "existing@example.com",
          password: "password123",
          fullName: "New User",
          role: "STUDENT",
        })
      ).rejects.toThrow("Email already registered");
    });

    it("should throw ValidationError for duplicate studentId", async () => {
      await expect(
        registerUseCase.execute({
          email: "new@example.com",
          password: "password123",
          fullName: "New User",
          role: "STUDENT",
          studentId: "SV001", // Already exists
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        registerUseCase.execute({
          email: "new@example.com",
          password: "password123",
          fullName: "New User",
          role: "STUDENT",
          studentId: "SV001",
        })
      ).rejects.toThrow("Student ID already registered");
    });

    it("should throw ValidationError for duplicate advisorId", async () => {
      // Add an advisor
      const existingAdvisor = createStudentUser({
        id: "existing-advisor",
        email: "advisor@example.com",
        advisorId: "GV001",
        studentId: null,
        role: "ADVISOR",
      });
      mockUserRepository.reset([
        ...mockUserRepository.getAll(),
        existingAdvisor,
      ]);

      await expect(
        registerUseCase.execute({
          email: "new@example.com",
          password: "password123",
          fullName: "New Advisor",
          role: "ADVISOR",
          advisorId: "GV001", // Already exists
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        registerUseCase.execute({
          email: "new@example.com",
          password: "password123",
          fullName: "New Advisor",
          role: "ADVISOR",
          advisorId: "GV001",
        })
      ).rejects.toThrow("Advisor ID already registered");
    });

    it("should allow same studentId and advisorId for different users", async () => {
      // studentId and advisorId are separate namespaces
      const result = await registerUseCase.execute({
        email: "new@example.com",
        password: "password123",
        fullName: "New User",
        role: "ADVISOR",
        advisorId: "SV001", // Same as existing studentId but different namespace
      });

      expect(result.user).toBeDefined();
    });
  });

  describe("Error Codes", () => {
    it("should return proper error code and status for validation errors", async () => {
      try {
        await registerUseCase.execute({
          email: "invalid",
          password: "password123",
          fullName: "Test User",
          role: "STUDENT",
        });
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).statusCode).toBe(400);
        expect((error as ValidationError).code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("User Roles", () => {
    const roles: Array<"STUDENT" | "ADVISOR" | "ADMIN"> = [
      "STUDENT",
      "ADVISOR",
      "ADMIN",
    ];

    roles.forEach((role) => {
      it(`should register user with ${role} role`, async () => {
        mockUserRepository.reset([]);
        const result = await registerUseCase.execute({
          email: `${role.toLowerCase()}@example.com`,
          password: "password123",
          fullName: `${role} User`,
          role,
        });

        expect(result.user.role).toBe(role);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty studentId as null", async () => {
      const result = await registerUseCase.execute({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        role: "STUDENT",
        studentId: "",
      });

      expect(result.user.studentId).toBeNull();
    });

    it("should handle undefined studentId", async () => {
      const result = await registerUseCase.execute({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        role: "STUDENT",
      });

      expect(result.user.studentId).toBeNull();
    });

    it("should handle special characters in fullName", async () => {
      const result = await registerUseCase.execute({
        email: "test@example.com",
        password: "password123",
        fullName: "Nguyễn Văn Đức",
        role: "STUDENT",
      });

      expect(result.user.fullName).toBe("Nguyễn Văn Đức");
    });
  });
});
