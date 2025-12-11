/**
 * Integration Tests for Questions API Routes
 */

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/questions/route";

// Mock Prisma
jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    question: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    questionCategory: {
      createMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth middleware
jest.mock("@/app/api/middleware/auth", () => ({
  getAuthUser: jest.fn(),
  requireRole: jest.fn(),
}));

// Mock embeddings
jest.mock("@/shared/utils/embeddings", () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
  formatEmbeddingForPostgres: jest.fn().mockReturnValue("[0.1,0.1,...]"),
  getEmbeddingDimensions: jest.fn().mockReturnValue(768),
}));

// Mock content processor
jest.mock("@/shared/utils/editor-content-processor", () => ({
  processEditorContent: jest.fn().mockImplementation((content) => content),
}));

// Mock content extractor
jest.mock("@/shared/utils/editor-content-extractor", () => ({
  extractImagesFromContent: jest.fn().mockReturnValue([]),
  extractTextPreview: jest.fn().mockImplementation((content) => content.substring(0, 150)),
}));

import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

describe("Questions API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/questions", () => {
    const mockQuestions = [
      {
        id: "q-1",
        title: "Test Question 1",
        content: "Test content 1",
        status: "OPEN",
        approvalStatus: "APPROVED",
        isAnonymous: false,
        authorId: "user-1",
        categoryId: "cat-1",
        views: 10,
        acceptedAnswerId: null,
        duplicateOfId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: "user-1",
          email: "user1@example.com",
          fullName: "User 1",
          role: "STUDENT",
        },
        category: {
          id: "cat-1",
          name: "General",
          slug: "general",
        },
        categories: [],
        tags: [],
        _count: {
          answers: 5,
        },
      },
      {
        id: "q-2",
        title: "Test Question 2",
        content: "Test content 2",
        status: "ANSWERED",
        approvalStatus: "APPROVED",
        isAnonymous: false,
        authorId: "user-2",
        categoryId: "cat-1",
        views: 20,
        acceptedAnswerId: "ans-1",
        duplicateOfId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: "user-2",
          email: "user2@example.com",
          fullName: "User 2",
          role: "STUDENT",
        },
        category: {
          id: "cat-1",
          name: "General",
          slug: "general",
        },
        categories: [],
        tags: [],
        _count: {
          answers: 3,
        },
      },
    ];

    it("should return list of questions with pagination", async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);
      mockGetAuthUser.mockImplementation(() => {
        throw new Error("Not authenticated");
      });

      const request = new NextRequest("http://localhost/api/questions?page=1&limit=10");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
    });

    it("should filter questions by status", async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue([mockQuestions[0]]);

      const request = new NextRequest("http://localhost/api/questions?status=OPEN");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "OPEN",
          }),
        })
      );
    });

    it("should filter questions by categoryId", async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const request = new NextRequest("http://localhost/api/questions?categoryId=cat-1");

      await GET(request);

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: "cat-1",
          }),
        })
      );
    });

    it("should search questions by query", async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue([mockQuestions[0]]);

      const request = new NextRequest("http://localhost/api/questions?query=test");

      await GET(request);

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                title: expect.objectContaining({ contains: "test" }),
              }),
            ]),
          }),
        })
      );
    });

    it("should hide author for anonymous questions to students", async () => {
      const anonymousQuestion = {
        ...mockQuestions[0],
        isAnonymous: true,
        authorId: "other-user",
      };

      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue([anonymousQuestion]);
      mockGetAuthUser.mockReturnValue({
        userId: "student-user",
        email: "student@example.com",
        role: "STUDENT",
      });

      const request = new NextRequest("http://localhost/api/questions");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions[0].author.fullName).toBe("Người dùng ẩn danh");
    });

    it("should show author for anonymous questions to advisors/admins", async () => {
      const anonymousQuestion = {
        ...mockQuestions[0],
        isAnonymous: true,
      };

      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue([anonymousQuestion]);
      mockGetAuthUser.mockReturnValue({
        userId: "advisor-user",
        email: "advisor@example.com",
        role: "ADVISOR",
      });

      const request = new NextRequest("http://localhost/api/questions");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions[0].author.fullName).toBe("User 1");
    });
  });

  describe("POST /api/questions", () => {
    const mockUser = {
      id: "user-1",
      email: "student@example.com",
      fullName: "Student User",
      role: "STUDENT",
      studentId: "SV001",
      advisorId: null,
    };

    const mockCategory = {
      id: "cat-1",
      name: "General",
      slug: "general",
    };

    beforeEach(() => {
      mockGetAuthUser.mockReturnValue({
        userId: "user-1",
        email: "student@example.com",
        role: "STUDENT",
      });
      mockRequireRole.mockImplementation(() => {}); // No-op, passes
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    });

    it("should return 400 when title is missing", async () => {
      const request = new NextRequest("http://localhost/api/questions", {
        method: "POST",
        body: JSON.stringify({
          content: "Test content",
          categoryId: "cat-1",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("Title");
    });

    it("should return 400 when content is missing", async () => {
      const request = new NextRequest("http://localhost/api/questions", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Title",
          categoryId: "cat-1",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("content");
    });

    it("should return 400 when categoryId is missing", async () => {
      const request = new NextRequest("http://localhost/api/questions", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Title",
          content: "Test content",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("categoryId");
    });

    it("should create question with PENDING status for students", async () => {
      const createdQuestion = {
        id: "new-q-1",
        title: "New Question",
        content: "New content",
        status: "OPEN",
        approvalStatus: "PENDING",
        authorId: "user-1",
        categoryId: "cat-1",
        views: 0,
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.question.create as jest.Mock).mockResolvedValue(createdQuestion);
      (mockPrisma.questionCategory.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const request = new NextRequest("http://localhost/api/questions", {
        method: "POST",
        body: JSON.stringify({
          title: "New Question",
          content: "New content",
          categoryId: "cat-1",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.question).toBeDefined();
      expect(data.question.title).toBe("New Question");
    });

    it("should create question with APPROVED status for advisors", async () => {
      mockGetAuthUser.mockReturnValue({
        userId: "advisor-1",
        email: "advisor@example.com",
        role: "ADVISOR",
      });

      const advisorUser = {
        ...mockUser,
        id: "advisor-1",
        role: "ADVISOR",
        studentId: null,
        advisorId: "GV001",
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(advisorUser);

      const createdQuestion = {
        id: "new-q-2",
        title: "Advisor Question",
        content: "Advisor content",
        status: "OPEN",
        approvalStatus: "APPROVED",
        authorId: "advisor-1",
        categoryId: "cat-1",
        views: 0,
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.question.create as jest.Mock).mockResolvedValue(createdQuestion);
      (mockPrisma.questionCategory.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const request = new NextRequest("http://localhost/api/questions", {
        method: "POST",
        body: JSON.stringify({
          title: "Advisor Question",
          content: "Advisor content",
          categoryId: "cat-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("should create anonymous question", async () => {
      const createdQuestion = {
        id: "new-q-3",
        title: "Anonymous Question",
        content: "Anonymous content",
        status: "OPEN",
        approvalStatus: "PENDING",
        authorId: "user-1",
        categoryId: "cat-1",
        views: 0,
        isAnonymous: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.question.create as jest.Mock).mockResolvedValue(createdQuestion);
      (mockPrisma.questionCategory.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const request = new NextRequest("http://localhost/api/questions", {
        method: "POST",
        body: JSON.stringify({
          title: "Anonymous Question",
          content: "Anonymous content",
          categoryId: "cat-1",
          isAnonymous: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should support multiple categoryIds", async () => {
      const createdQuestion = {
        id: "new-q-4",
        title: "Multi-category Question",
        content: "Content",
        status: "OPEN",
        approvalStatus: "PENDING",
        authorId: "user-1",
        categoryId: "cat-1",
        views: 0,
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.question.create as jest.Mock).mockResolvedValue(createdQuestion);
      (mockPrisma.questionCategory.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const request = new NextRequest("http://localhost/api/questions", {
        method: "POST",
        body: JSON.stringify({
          title: "Multi-category Question",
          content: "Content",
          categoryId: "cat-1",
          categoryIds: ["cat-1", "cat-2"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors", async () => {
      (mockPrisma.question.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/questions");

      const response = await GET(request);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it("should handle unauthorized access for POST", async () => {
      mockGetAuthUser.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const request = new NextRequest("http://localhost/api/questions", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          content: "Test",
          categoryId: "cat-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

