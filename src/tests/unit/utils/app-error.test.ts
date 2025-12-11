/**
 * Unit Tests for Application Error Classes
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "@/usecase/errors/app-error";

describe("Application Error Classes", () => {
  describe("AppError", () => {
    it("should create an error with message, code, and statusCode", () => {
      const error = new AppError("Test error", "TEST_ERROR", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("AppError");
    });

    it("should default statusCode to 500", () => {
      const error = new AppError("Test error", "TEST_ERROR");

      expect(error.statusCode).toBe(500);
    });

    it("should have proper stack trace", () => {
      const error = new AppError("Test error", "TEST_ERROR");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AppError");
    });

    it("should be throwable and catchable", () => {
      const throwError = () => {
        throw new AppError("Thrown error", "THROWN_ERROR", 500);
      };

      expect(throwError).toThrow(AppError);
      expect(throwError).toThrow("Thrown error");
    });
  });

  describe("ValidationError", () => {
    it("should create a validation error with correct defaults", () => {
      const error = new ValidationError("Invalid input");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Invalid input");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("ValidationError");
    });

    it("should be catchable as AppError", () => {
      try {
        throw new ValidationError("Test");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
      }
    });

    it("should contain descriptive messages for various validation scenarios", () => {
      const errors = [
        new ValidationError("Email is required"),
        new ValidationError("Password must be at least 6 characters"),
        new ValidationError("Invalid email format"),
        new ValidationError("Title is required"),
      ];

      errors.forEach((error) => {
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe("VALIDATION_ERROR");
      });
    });
  });

  describe("NotFoundError", () => {
    it("should create a not found error with correct defaults", () => {
      const error = new NotFoundError("User not found");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("User not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("NotFoundError");
    });

    it("should work for different resource types", () => {
      const errors = [
        new NotFoundError("User not found"),
        new NotFoundError("Question not found"),
        new NotFoundError("Category not found"),
        new NotFoundError("Answer not found"),
      ];

      errors.forEach((error) => {
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe("NOT_FOUND");
      });
    });
  });

  describe("UnauthorizedError", () => {
    it("should create an unauthorized error with default message", () => {
      const error = new UnauthorizedError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe("Unauthorized");
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe("UnauthorizedError");
    });

    it("should create an unauthorized error with custom message", () => {
      const error = new UnauthorizedError("Invalid email or password");

      expect(error.message).toBe("Invalid email or password");
      expect(error.statusCode).toBe(401);
    });

    it("should work for various authentication scenarios", () => {
      const errors = [
        new UnauthorizedError("Invalid credentials"),
        new UnauthorizedError("Token expired"),
        new UnauthorizedError("Invalid token"),
        new UnauthorizedError(), // Default message
      ];

      errors.forEach((error) => {
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe("UNAUTHORIZED");
      });
    });
  });

  describe("ForbiddenError", () => {
    it("should create a forbidden error with default message", () => {
      const error = new ForbiddenError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("Forbidden");
      expect(error.code).toBe("FORBIDDEN");
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe("ForbiddenError");
    });

    it("should create a forbidden error with custom message", () => {
      const error = new ForbiddenError("User cannot answer questions");

      expect(error.message).toBe("User cannot answer questions");
      expect(error.statusCode).toBe(403);
    });

    it("should work for various authorization scenarios", () => {
      const errors = [
        new ForbiddenError("User cannot create questions"),
        new ForbiddenError("User cannot manage users"),
        new ForbiddenError("User cannot close questions"),
        new ForbiddenError("Admin access required"),
      ];

      errors.forEach((error) => {
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe("FORBIDDEN");
      });
    });
  });

  describe("Error Hierarchy", () => {
    it("should maintain proper inheritance chain", () => {
      const validationError = new ValidationError("Test");
      const notFoundError = new NotFoundError("Test");
      const unauthorizedError = new UnauthorizedError("Test");
      const forbiddenError = new ForbiddenError("Test");

      // All should be instances of Error
      expect(validationError).toBeInstanceOf(Error);
      expect(notFoundError).toBeInstanceOf(Error);
      expect(unauthorizedError).toBeInstanceOf(Error);
      expect(forbiddenError).toBeInstanceOf(Error);

      // All should be instances of AppError
      expect(validationError).toBeInstanceOf(AppError);
      expect(notFoundError).toBeInstanceOf(AppError);
      expect(unauthorizedError).toBeInstanceOf(AppError);
      expect(forbiddenError).toBeInstanceOf(AppError);
    });

    it("should be distinguishable by type", () => {
      const errors = [
        new ValidationError("Test"),
        new NotFoundError("Test"),
        new UnauthorizedError("Test"),
        new ForbiddenError("Test"),
      ];

      expect(errors[0]).toBeInstanceOf(ValidationError);
      expect(errors[0]).not.toBeInstanceOf(NotFoundError);

      expect(errors[1]).toBeInstanceOf(NotFoundError);
      expect(errors[1]).not.toBeInstanceOf(ValidationError);

      expect(errors[2]).toBeInstanceOf(UnauthorizedError);
      expect(errors[2]).not.toBeInstanceOf(ForbiddenError);

      expect(errors[3]).toBeInstanceOf(ForbiddenError);
      expect(errors[3]).not.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("Error Handling Patterns", () => {
    it("should be catchable by specific type", async () => {
      const throwValidation = async () => {
        throw new ValidationError("Invalid");
      };

      await expect(throwValidation()).rejects.toThrow(ValidationError);
      await expect(throwValidation()).rejects.toThrow("Invalid");
    });

    it("should allow accessing error properties in catch block", async () => {
      try {
        throw new ValidationError("Test validation error");
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.message).toBe("Test validation error");
          expect(error.statusCode).toBe(400);
          expect(error.code).toBe("VALIDATION_ERROR");
        } else {
          fail("Should have been ValidationError");
        }
      }
    });

    it("should work with Promise rejection", async () => {
      const failingPromise = Promise.reject(new NotFoundError("Resource not found"));

      await expect(failingPromise).rejects.toThrow(NotFoundError);
      await expect(Promise.reject(new NotFoundError("Test"))).rejects.toThrow("Test");
    });
  });

  describe("Error Status Codes Summary", () => {
    it("should have correct HTTP status codes", () => {
      expect(new ValidationError("").statusCode).toBe(400);
      expect(new UnauthorizedError("").statusCode).toBe(401);
      expect(new ForbiddenError("").statusCode).toBe(403);
      expect(new NotFoundError("").statusCode).toBe(404);
      expect(new AppError("", "", 500).statusCode).toBe(500);
    });

    it("should have correct error codes", () => {
      expect(new ValidationError("").code).toBe("VALIDATION_ERROR");
      expect(new UnauthorizedError("").code).toBe("UNAUTHORIZED");
      expect(new ForbiddenError("").code).toBe("FORBIDDEN");
      expect(new NotFoundError("").code).toBe("NOT_FOUND");
    });
  });
});

