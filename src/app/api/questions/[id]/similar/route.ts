import { NextRequest, NextResponse } from "next/server";
import { handleHttpError } from "@/shared/utils/http-error";
import { prisma } from "@/infrastructure/database/prisma";
import {
  generateEmbedding,
  formatEmbeddingForPostgres,
} from "@/shared/utils/embeddings";
import { getAuthUser } from "@/app/api/middleware/auth";

/**
 * GET /api/questions/[id]/similar
 * Tìm các câu hỏi tương tự dựa trên cosine similarity
 * Query params:
 * - limit: number (default: 5)
 * - threshold: number (default: 0.7) - minimum similarity threshold
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const threshold = parseFloat(searchParams.get("threshold") || "0.7");

    if (!id) {
      return NextResponse.json(
        { message: "ID câu hỏi không hợp lệ" },
        { status: 400 }
      );
    }

    // Get the question (using raw query to access embedding field)
    const questionResult = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        content: string;
        approvalStatus: string;
        authorId: string;
      }>
    >`
      SELECT id, title, content, "approvalStatus", "authorId"
      FROM questions
      WHERE id = ${id}
    `;

    const question = questionResult[0];

    if (!question) {
      return NextResponse.json(
        { message: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    // Check if question has embedding, if not generate one
    let embedding: number[] | null = null;

    // Try to get embedding from database
    try {
      const embeddingResult = await prisma.$queryRaw<
        Array<{ embedding: string | null }>
      >`
        SELECT embedding::text as embedding
        FROM questions
        WHERE id = ${id} AND embedding IS NOT NULL
      `;

      if (
        embeddingResult &&
        embeddingResult.length > 0 &&
        embeddingResult[0].embedding
      ) {
        try {
          // Parse the vector string format: [0.1,0.2,0.3] or (0.1,0.2,0.3)
          const vectorString = embeddingResult[0].embedding
            .replace(/[\[\]()]/g, "")
            .trim();
          if (vectorString) {
            embedding = vectorString
              .split(",")
              .map((v) => parseFloat(v.trim()));
            // Validate embedding length
            if (embedding.length !== 1536) {
              console.warn(
                `Invalid embedding length: ${embedding.length}, expected 1536`
              );
              embedding = null;
            }
          }
        } catch (parseError) {
          console.error("Error parsing embedding:", parseError);
          embedding = null;
        }
      }
    } catch (e) {
      console.error("Error reading embedding:", e);
    }

    // If no embedding, try to generate one (but don't fail if API key is missing)
    if (!embedding) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn(
          "OPENAI_API_KEY not set, cannot generate embeddings. Returning empty results."
        );
        return NextResponse.json({
          questions: [],
          message:
            "Tính năng tìm câu hỏi tương tự chưa được kích hoạt. Vui lòng cấu hình OPENAI_API_KEY.",
        });
      }

      try {
        const embeddingText = `${question.title} ${question.content}`;
        console.log(
          `[Similar Questions] Generating embedding for question ${id}, text length: ${embeddingText.length}`
        );

        embedding = await generateEmbedding(embeddingText);

        if (!embedding || embedding.length === 0) {
          throw new Error("Generated embedding is empty");
        }

        console.log(
          `[Similar Questions] Embedding generated successfully, length: ${embedding.length}`
        );

        const embeddingString = formatEmbeddingForPostgres(embedding);
        console.log(
          `[Similar Questions] Formatted embedding string (first 100 chars): ${embeddingString.substring(
            0,
            100
          )}...`
        );

        // Save embedding using Prisma's parameterized query
        // Note: We need to use Prisma.$executeRawUnsafe for vector type since Prisma doesn't support it natively
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE questions SET embedding = $1::vector WHERE id = $2`,
            embeddingString,
            id
          );
          console.log(
            `[Similar Questions] Embedding saved to database for question ${id}`
          );
        } catch (dbError) {
          console.error(
            `[Similar Questions] Failed to save embedding to database:`,
            dbError
          );
          // Don't throw, embedding is generated but not saved - we can still use it for this request
        }
      } catch (embeddingError) {
        console.error("[Similar Questions] Failed to generate embedding:", {
          error: embeddingError,
          message:
            embeddingError instanceof Error
              ? embeddingError.message
              : String(embeddingError),
          stack:
            embeddingError instanceof Error ? embeddingError.stack : undefined,
          questionId: id,
          hasApiKey: !!process.env.OPENAI_API_KEY,
        });
        return NextResponse.json(
          {
            questions: [],
            message:
              "Không thể tạo embedding để tìm câu hỏi tương tự. Vui lòng thử lại sau.",
            error:
              process.env.NODE_ENV === "development"
                ? embeddingError instanceof Error
                  ? embeddingError.message
                  : String(embeddingError)
                : undefined,
          },
          { status: 200 } // Return 200 with empty results instead of 500
        );
      }
    }

    if (!embedding || embedding.length === 0) {
      return NextResponse.json({
        questions: [],
        message: "Không tìm thấy câu hỏi tương tự",
      });
    }

    // Get authenticated user to filter by approval status
    let authUserId: string | undefined;
    let authUserRole: string | undefined;
    try {
      const authUser = getAuthUser(request);
      authUserId = authUser.userId;
      authUserRole = authUser.role;
    } catch (e) {
      // Not authenticated
    }

    // Find similar questions using cosine similarity
    // Using 1 - cosine_distance for similarity (higher = more similar)
    const embeddingString = formatEmbeddingForPostgres(embedding);

    // Build query with proper parameterization to avoid SQL injection
    let similarQuestions: Array<{
      id: string;
      title: string;
      content: string;
      similarity: number;
      approvalStatus: string;
      authorId: string;
      views: number;
      createdAt: Date;
    }>;

    if (authUserRole === "ADMIN") {
      // Admin can see all questions
      similarQuestions = await prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          content: string;
          similarity: number;
          approvalStatus: string;
          authorId: string;
          views: number;
          createdAt: Date;
        }>
      >`
        SELECT 
          q.id,
          q.title,
          q.content,
          1 - (q.embedding <=> ${embeddingString}::vector) as similarity,
          q."approvalStatus",
          q."authorId",
          q.views,
          q."createdAt"
        FROM questions q
        WHERE q.id != ${id}
          AND q.embedding IS NOT NULL
        ORDER BY q.embedding <=> ${embeddingString}::vector
        LIMIT ${limit}
      `;
    } else if (authUserId) {
      // Regular authenticated users: only approved + their own pending/rejected
      similarQuestions = await prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          content: string;
          similarity: number;
          approvalStatus: string;
          authorId: string;
          views: number;
          createdAt: Date;
        }>
      >`
        SELECT 
          q.id,
          q.title,
          q.content,
          1 - (q.embedding <=> ${embeddingString}::vector) as similarity,
          q."approvalStatus",
          q."authorId",
          q.views,
          q."createdAt"
        FROM questions q
        WHERE q.id != ${id}
          AND q.embedding IS NOT NULL
          AND (
            q."approvalStatus" = 'APPROVED'
            OR (q."approvalStatus" = 'PENDING' AND q."authorId" = ${authUserId})
            OR (q."approvalStatus" = 'REJECTED' AND q."authorId" = ${authUserId})
          )
        ORDER BY q.embedding <=> ${embeddingString}::vector
        LIMIT ${limit}
      `;
    } else {
      // Unauthenticated users: only approved
      similarQuestions = await prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          content: string;
          similarity: number;
          approvalStatus: string;
          authorId: string;
          views: number;
          createdAt: Date;
        }>
      >`
        SELECT 
          q.id,
          q.title,
          q.content,
          1 - (q.embedding <=> ${embeddingString}::vector) as similarity,
          q."approvalStatus",
          q."authorId",
          q.views,
          q."createdAt"
        FROM questions q
        WHERE q.id != ${id}
          AND q.embedding IS NOT NULL
          AND q."approvalStatus" = 'APPROVED'
        ORDER BY q.embedding <=> ${embeddingString}::vector
        LIMIT ${limit}
      `;
    }

    // Filter by similarity threshold and validate similarity scores
    const filtered = similarQuestions
      .filter((q) => q.similarity >= threshold && !isNaN(q.similarity))
      .filter((q) => q.similarity > 0); // Ensure similarity is positive

    // Get full question details
    const questionIds = filtered.map((q) => q.id);
    if (questionIds.length === 0) {
      return NextResponse.json({
        questions: [],
        message: "Không tìm thấy câu hỏi tương tự",
      });
    }

    const fullQuestions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
      },
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
        _count: {
          select: {
            answers: true,
          },
        },
      },
    });

    // Map similarity scores
    const similarityMap = new Map(filtered.map((q) => [q.id, q.similarity]));

    const result = fullQuestions
      .map((q) => ({
        id: q.id,
        title: q.title,
        content: q.content,
        similarity: similarityMap.get(q.id) || 0,
        author: q.author,
        category: q.category,
        categories: (q.categories || []).map((qc: any) => qc.category),
        views: q.views,
        answersCount: q._count.answers || 0,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      }))
      .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

    return NextResponse.json({
      questions: result,
      count: result.length,
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
