/**
 * Integration Tests for Categories API Routes
 */

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/categories/route";

// Mock Prisma
jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock auth middleware
jest.mock("@/app/api/middleware/auth", () => ({
  getAuthUser: jest.fn(),
  requireRole: jest.fn(),
}));

// Mock slug utility
jest.mock("@/shared/utils/slug", () => ({
  generateSlug: jest.fn().mockImplementation((text) => 
    text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  ),
}));

import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

describe("Categories API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    const mockCategories = [
      {
        id: "cat-1",
        name: "Học vụ",
        slug: "hoc-vu",
        description: "Các câu hỏi về học vụ",
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          questions: 10,
        },
      },
      {
        id: "cat-2",
        name: "Học phí",
        slug: "hoc-phi",
        description: "Các câu hỏi về học phí",
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          questions: 5,
        },
      },
      {
        id: "cat-3",
        name: "Đăng ký học phần",
        slug: "dang-ky-hoc-phan",
        description: "Câu hỏi về đăng ký học phần",
        parentId: "cat-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          questions: 3,
        },
      },
    ];

    it("should return all categories", async () => {
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const request = new NextRequest("http://localhost/api/categories");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toBeDefined();
      expect(data.categories).toHaveLength(3);
    });

    it("should include question count for each category", async () => {
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const request = new NextRequest("http://localhost/api/categories");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories[0]._count.questions).toBe(10);
    });

    it("should return categories in order", async () => {
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const request = new NextRequest("http://localhost/api/categories");

      await GET(request);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.any(Object),
        })
      );
    });

    it("should handle empty categories", async () => {
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/categories");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toEqual([]);
    });
  });

  describe("POST /api/categories", () => {
    beforeEach(() => {
      mockGetAuthUser.mockReturnValue({
        userId: "admin-1",
        email: "admin@example.com",
        role: "ADMIN",
      });
      mockRequireRole.mockImplementation(() => {});
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it("should create a new category", async () => {
      const newCategory = {
        id: "new-cat-1",
        name: "New Category",
        slug: "new-category",
        description: "Description",
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.category.create as jest.Mock).mockResolvedValue(newCategory);

      const request = new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "New Category",
          description: "Description",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.category).toBeDefined();
      expect(data.category.name).toBe("New Category");
    });

    it("should return 400 when name is missing", async () => {
      const request = new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({
          description: "Description only",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for duplicate category name", async () => {
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-cat",
        name: "Existing Category",
        slug: "existing-category",
      });

      const request = new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "Existing Category",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should create subcategory with parentId", async () => {
      const parentCategory = {
        id: "parent-cat",
        name: "Parent",
        slug: "parent",
      };

      const newSubcategory = {
        id: "sub-cat-1",
        name: "Subcategory",
        slug: "subcategory",
        description: null,
        parentId: "parent-cat",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(parentCategory);
      (mockPrisma.category.create as jest.Mock).mockResolvedValue(newSubcategory);

      const request = new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "Subcategory",
          parentId: "parent-cat",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.category.parentId).toBe("parent-cat");
    });

    it("should return 404 for non-existent parent category", async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "Subcategory",
          parentId: "non-existent-parent",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
    });

    it("should generate slug from name", async () => {
      const newCategory = {
        id: "new-cat-2",
        name: "Học vụ và Đào tạo",
        slug: "hoc-vu-va-dao-tao",
        description: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.category.create as jest.Mock).mockResolvedValue(newCategory);

      const request = new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "Học vụ và Đào tạo",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.any(String),
          }),
        })
      );
    });

    it("should require ADMIN role", async () => {
      mockGetAuthUser.mockReturnValue({
        userId: "student-1",
        email: "student@example.com",
        role: "STUDENT",
      });

      mockRequireRole.mockImplementation(() => {
        throw new Error("Forbidden");
      });

      const request = new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Category",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors for GET", async () => {
      (mockPrisma.category.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/categories");

      const response = await GET(request);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it("should handle database errors for POST", async () => {
      mockGetAuthUser.mockReturnValue({
        userId: "admin-1",
        email: "admin@example.com",
        role: "ADMIN",
      });
      mockRequireRole.mockImplementation(() => {});
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.category.create as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Category",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });
});

