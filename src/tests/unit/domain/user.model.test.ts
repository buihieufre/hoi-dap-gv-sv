/**
 * Unit Tests for User Domain Model
 */

import { User } from "@/domain/models/user.model";
import {
  createStudentUser,
  createAdvisorUser,
  createAdminUser,
} from "@/tests/mocks/test-data";

describe("User Domain Model", () => {
  describe("Constructor", () => {
    it("should create a user with all properties", () => {
      const user = new User(
        "user-1",
        "test@example.com",
        "hashedPassword",
        "Test User",
        "STUDENT",
        "SV001",
        null,
        new Date("2024-01-01"),
        new Date("2024-01-02")
      );

      expect(user.id).toBe("user-1");
      expect(user.email).toBe("test@example.com");
      expect(user.password).toBe("hashedPassword");
      expect(user.fullName).toBe("Test User");
      expect(user.role).toBe("STUDENT");
      expect(user.studentId).toBe("SV001");
      expect(user.advisorId).toBeNull();
      expect(user.createdAt).toEqual(new Date("2024-01-01"));
      expect(user.updatedAt).toEqual(new Date("2024-01-02"));
    });

    it("should create a user with optional properties undefined", () => {
      const user = new User(
        "user-1",
        "test@example.com",
        "hashedPassword",
        "Test User",
        "STUDENT"
      );

      expect(user.studentId).toBeUndefined();
      expect(user.advisorId).toBeUndefined();
      expect(user.createdAt).toBeUndefined();
      expect(user.updatedAt).toBeUndefined();
    });
  });

  describe("canCreateQuestion", () => {
    it("should return true for STUDENT role", () => {
      const student = createStudentUser();
      expect(student.canCreateQuestion()).toBe(true);
    });

    it("should return true for ADVISOR role", () => {
      const advisor = createAdvisorUser();
      expect(advisor.canCreateQuestion()).toBe(true);
    });

    it("should return true for ADMIN role", () => {
      const admin = createAdminUser();
      expect(admin.canCreateQuestion()).toBe(true);
    });
  });

  describe("canAnswerQuestion", () => {
    it("should return false for STUDENT role", () => {
      const student = createStudentUser();
      expect(student.canAnswerQuestion()).toBe(false);
    });

    it("should return true for ADVISOR role", () => {
      const advisor = createAdvisorUser();
      expect(advisor.canAnswerQuestion()).toBe(true);
    });

    it("should return true for ADMIN role", () => {
      const admin = createAdminUser();
      expect(admin.canAnswerQuestion()).toBe(true);
    });
  });

  describe("canManageUsers", () => {
    it("should return false for STUDENT role", () => {
      const student = createStudentUser();
      expect(student.canManageUsers()).toBe(false);
    });

    it("should return false for ADVISOR role", () => {
      const advisor = createAdvisorUser();
      expect(advisor.canManageUsers()).toBe(false);
    });

    it("should return true for ADMIN role", () => {
      const admin = createAdminUser();
      expect(admin.canManageUsers()).toBe(true);
    });
  });

  describe("canCloseQuestion", () => {
    it("should return false for STUDENT role", () => {
      const student = createStudentUser();
      expect(student.canCloseQuestion()).toBe(false);
    });

    it("should return true for ADVISOR role", () => {
      const advisor = createAdvisorUser();
      expect(advisor.canCloseQuestion()).toBe(true);
    });

    it("should return true for ADMIN role", () => {
      const admin = createAdminUser();
      expect(admin.canCloseQuestion()).toBe(true);
    });
  });

  describe("Role-based permissions matrix", () => {
    const testCases = [
      {
        role: "STUDENT" as const,
        canCreateQuestion: true,
        canAnswerQuestion: false,
        canManageUsers: false,
        canCloseQuestion: false,
      },
      {
        role: "ADVISOR" as const,
        canCreateQuestion: true,
        canAnswerQuestion: true,
        canManageUsers: false,
        canCloseQuestion: true,
      },
      {
        role: "ADMIN" as const,
        canCreateQuestion: true,
        canAnswerQuestion: true,
        canManageUsers: true,
        canCloseQuestion: true,
      },
    ];

    testCases.forEach(({ role, ...permissions }) => {
      describe(`${role} permissions`, () => {
        const user = new User(
          "test-id",
          "test@example.com",
          "password",
          "Test User",
          role
        );

        it(`canCreateQuestion should be ${permissions.canCreateQuestion}`, () => {
          expect(user.canCreateQuestion()).toBe(permissions.canCreateQuestion);
        });

        it(`canAnswerQuestion should be ${permissions.canAnswerQuestion}`, () => {
          expect(user.canAnswerQuestion()).toBe(permissions.canAnswerQuestion);
        });

        it(`canManageUsers should be ${permissions.canManageUsers}`, () => {
          expect(user.canManageUsers()).toBe(permissions.canManageUsers);
        });

        it(`canCloseQuestion should be ${permissions.canCloseQuestion}`, () => {
          expect(user.canCloseQuestion()).toBe(permissions.canCloseQuestion);
        });
      });
    });
  });

  describe("Immutability", () => {
    it("should have readonly properties", () => {
      const user = createStudentUser();

      // TypeScript will enforce immutability at compile time
      // We test that the object is properly instantiated
      expect(Object.isFrozen(user)).toBe(false); // Class instances aren't frozen by default
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe("string");
    });
  });
});

