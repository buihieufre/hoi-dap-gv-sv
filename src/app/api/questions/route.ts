import { NextRequest, NextResponse } from "next/server";
import { CreateQuestionUseCase } from "@/usecase/question/create-question.usecase";
import { SearchQuestionsUseCase } from "@/usecase/question/search-questions.usecase";
import { QuestionRepository } from "@/infrastructure/repositories/question.repository.prisma";
import { UserRepository } from "@/infrastructure/repositories/user.repository.prisma";
import { CategoryRepository } from "@/infrastructure/repositories/category.repository.prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { QuestionStatus } from "@/shared/types";
import { prisma } from "@/infrastructure/database/prisma";
import { processEditorContent } from "@/shared/utils/editor-content-processor";
import {
  extractImagesFromContent,
  extractTextPreview,
} from "@/shared/utils/editor-content-extractor";
import {
  generateEmbedding,
  formatEmbeddingForPostgres,
  getEmbeddingDimensions,
} from "@/shared/utils/embeddings";

/**
 * GET /api/questions
 * Lấy danh sách câu hỏi với filter
 * Query params:
 * - status: OPEN | ANSWERED | CLOSED | DUPLICATE
 * - categoryId: string
 * - authorId: string
 * - query: string (search text)
 * - page: number
 * - limit: number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as QuestionStatus | null;
    const categoryId = searchParams.get("categoryId") || undefined;
    const authorId = searchParams.get("authorId") || undefined;
    const query = searchParams.get("query") || undefined;
    const approvalStatus = searchParams.get("approvalStatus") || undefined; // New filter param
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get authenticated user to check if they can see their own pending/rejected questions
    let authUserId: string | undefined;
    let authUserRole: string | undefined;
    try {
      const authUser = getAuthUser(request);
      authUserId = authUser.userId;
      authUserRole = authUser.role;
    } catch (e) {
      // Not authenticated, can only see approved questions
    }

    // Build approval filter:
    // - If approvalStatus filter is explicitly set, use it (for admin filtering)
    // - Admin can see all questions (no approval filter)
    // - Only show APPROVED questions to everyone else
    // - Authors can see their own PENDING questions
    // - Authors can ONLY see their own REJECTED questions (not others' rejected)
    let approvalFilter: any = {};

    if (approvalStatus) {
      // Explicit filter by approvalStatus (used by admin)
      approvalFilter = { approvalStatus };
    } else if (authUserRole === "ADMIN") {
      // Admin can see all questions (no approval filter)
      approvalFilter = {};
    } else {
      // Regular users: only approved + their own pending/rejected
      approvalFilter = {
        OR: [
          { approvalStatus: "APPROVED" },
          // If authenticated, show their own pending questions
          ...(authUserId
            ? [
                {
                  AND: [
                    { approvalStatus: "PENDING" },
                    { authorId: authUserId },
                  ],
                },
              ]
            : []),
          // If authenticated, show their own rejected questions (ONLY their own)
          ...(authUserId
            ? [
                {
                  AND: [
                    { approvalStatus: "REJECTED" },
                    { authorId: authUserId }, // Must be the author
                  ],
                },
              ]
            : []),
        ],
      };
    }

    // Get questions with full details from database with approval filter
    const questions = await prisma.question.findMany({
      where: {
        ...approvalFilter,
        ...(query && {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        }),
        ...(categoryId && { categoryId }),
        ...(authorId && { authorId }),
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
    });

    // Format response with author and category info
    const formattedQuestions = questions.map((q) => {
      // Extract images and preview text from content
      const images = extractImagesFromContent(q.content);
      const preview = extractTextPreview(q.content, 150);

      // Determine if author should be hidden (anonymous question viewed by student who is not the author)
      const isAnonymous = (q as any).isAnonymous || false;
      const shouldHideAuthor =
        isAnonymous && authUserRole === "STUDENT" && authUserId !== q.authorId;

      return {
        id: q.id,
        title: q.title,
        content: q.content,
        preview: preview,
        images: images,
        status: q.status,
        approvalStatus: q.approvalStatus,
        isAnonymous: isAnonymous,
        author: shouldHideAuthor
          ? {
              id: "anonymous",
              fullName: "Người dùng ẩn danh",
              email: "",
              role: "STUDENT",
            }
          : q.author
          ? {
              id: q.author.id,
              fullName: q.author.fullName,
              email: q.author.email,
              role: q.author.role,
            }
          : null,
        category: q.category
          ? {
              id: q.category.id,
              name: q.category.name,
              slug: q.category.slug,
            }
          : null,
        categories: (q.categories || []).map((qc: any) => ({
          id: qc.category.id,
          name: qc.category.name,
          slug: qc.category.slug,
        })),
        tags: q.tags.map((qt: any) => ({
          id: qt.tag.id,
          name: qt.tag.name,
          slug: qt.tag.slug,
        })),
        views: q.views,
        answersCount: q._count.answers || 0,
        acceptedAnswerId: q.acceptedAnswerId,
        duplicateOfId: q.duplicateOfId,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };
    });

    // Calculate pagination
    const total = formattedQuestions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedQuestions = formattedQuestions.slice(startIndex, endIndex);

    return NextResponse.json({
      questions: paginatedQuestions,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * POST /api/questions
 * Tạo câu hỏi mới
 * Body:
 * - title: string
 * - content: string
 * - categoryId: string
 * - tagIds?: string[]
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authUser = getAuthUser(request);
    requireRole(request, ["STUDENT", "ADVISOR", "ADMIN"]);

    const body = await request.json();
    let { title, content, categoryId, categoryIds, tagIds, isAnonymous } = body;

    // Support both categoryId (single, backward compatibility) and categoryIds (array)
    const categoryIdsArray =
      categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0
        ? categoryIds
        : categoryId
        ? [categoryId]
        : [];

    // Validation
    if (!title || !content || categoryIdsArray.length === 0) {
      return NextResponse.json(
        { message: "Title, content và ít nhất một categoryId là bắt buộc" },
        { status: 400 }
      );
    }

    // Process content: upload images to Cloudinary if needed
    try {
      content = await processEditorContent(content, "questions");
    } catch (error) {
      console.error("Error processing editor content:", error);
      return NextResponse.json(
        { message: "Lỗi khi xử lý nội dung. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    const questionRepository = new QuestionRepository();
    const userRepository = new UserRepository();
    const categoryRepository = new CategoryRepository();
    const createUseCase = new CreateQuestionUseCase(
      questionRepository,
      userRepository,
      categoryRepository
    );

    const question = await createUseCase.execute({
      title,
      content,
      categoryId: categoryIdsArray[0], // Primary category (backward compatibility)
      categoryIds: categoryIdsArray, // All categories
      tagIds: tagIds || [],
      authorId: authUser.userId,
      isAnonymous: isAnonymous || false, // Đặt câu hỏi ẩn danh
    });

    // Generate and save embedding for similarity search (async, non-blocking)
    // This ensures every new question gets an embedding immediately
    const generateEmbeddingAsync = async () => {
      try {
        const embeddingText = `${title} ${content}`;
        console.log(
          `[Question Create] Generating embedding for question ${question.id}...`
        );

        const embedding = await generateEmbedding(embeddingText);
        const embeddingString = formatEmbeddingForPostgres(embedding);

        // Verify dimensions before saving
        const expectedDimensions = getEmbeddingDimensions();
        if (embedding.length !== expectedDimensions) {
          throw new Error(
            `Embedding dimensions mismatch: got ${embedding.length}, expected ${expectedDimensions}`
          );
        }

        // Update question with embedding using raw SQL (Prisma doesn't support vector type directly)
        await prisma.$executeRawUnsafe(
          `UPDATE questions SET embedding = $1::vector(${expectedDimensions}) WHERE id = $2`,
          embeddingString,
          question.id
        );

        console.log(
          `[Question Create] ✅ Embedding saved for question ${question.id}`
        );
      } catch (embeddingError) {
        console.error(
          `[Question Create] ❌ Failed to generate embedding for question ${question.id}:`,
          embeddingError instanceof Error
            ? embeddingError.message
            : String(embeddingError)
        );
        // Don't fail the request if embedding fails, but log the error
      }
    };

    // Start embedding generation (don't await - non-blocking)
    generateEmbeddingAsync().catch((err) => {
      console.error("[Question Create] Unhandled embedding error:", err);
    });

    return NextResponse.json(
      {
        message: "Tạo câu hỏi thành công",
        question: {
          id: question.id,
          title: question.title,
          content: question.content,
          status: question.status,
          authorId: question.authorId,
          categoryId: question.categoryId,
          views: question.views,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleHttpError(error);
  }
}
