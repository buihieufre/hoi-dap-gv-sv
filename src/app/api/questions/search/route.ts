import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import {
  extractImagesFromContent,
  extractTextPreview,
  extractAllTextFromContent,
} from "@/shared/utils/editor-content-extractor";
import {
  generateEmbedding,
  formatEmbeddingForPostgres,
} from "@/shared/utils/embeddings";

/**
 * GET /api/questions/search
 * Hybrid search: combines database full-text search with vector similarity search
 * Query params:
 * - q: search query (text)
 * - tags: comma-separated tag names
 * - categoryId: string
 * - authorId: string
 * - status: OPEN | ANSWERED | CLOSED | DUPLICATE
 * - approvalStatus: PENDING | APPROVED | REJECTED
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - useVector: boolean (default: true) - enable vector similarity search
 * - vectorWeight: number (default: 0.5) - weight for vector results (0-1)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const tagsParam = searchParams.get("tags");
    const categoryId = searchParams.get("categoryId") || undefined;
    const authorId = searchParams.get("authorId") || undefined;
    const status = searchParams.get("status") || undefined;
    const approvalStatus = searchParams.get("approvalStatus") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const useVector = searchParams.get("useVector") !== "false"; // Default: true
    const vectorWeight = parseFloat(searchParams.get("vectorWeight") || "0.5"); // Default: 0.5

    // Parse tags
    const tagNames = tagsParam
      ? tagsParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    // Get authenticated user for approval filter
    let authUserId: string | undefined;
    let authUserRole: string | undefined;
    try {
      const authUser = getAuthUser(request);
      authUserId = authUser.userId;
      authUserRole = authUser.role;
    } catch (e) {
      // Not authenticated
    }

    // Build where clause using AND conditions
    const andConditions: any[] = [];

    // Text search query - search in multiple fields with improved matching
    // Note: Content is stored as JSON (Editor.js format)
    // Strategy: Search for exact phrase first, then individual words
    if (query && query.trim()) {
      const searchTerm = query.trim();

      // First, try exact phrase match (higher priority)
      const exactPhraseCondition = {
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          { content: { contains: searchTerm, mode: "insensitive" } },
          {
            category: {
              name: { contains: searchTerm, mode: "insensitive" },
            },
          },
          {
            author: {
              fullName: { contains: searchTerm, mode: "insensitive" },
            },
          },
          {
            tags: {
              some: {
                tag: {
                  name: { contains: searchTerm, mode: "insensitive" },
                },
              },
            },
          },
        ],
      };

      // Then, split into words for partial matching
      const searchWords = searchTerm
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

      // Build search conditions for each word
      // Each word should match in at least one field (OR within word)
      const wordConditions = searchWords.map((word) => ({
        OR: [
          // Search in title
          { title: { contains: word, mode: "insensitive" } },
          // Search in content JSON string
          { content: { contains: word, mode: "insensitive" } },
          // Search in category name
          {
            category: {
              name: { contains: word, mode: "insensitive" },
            },
          },
          // Search in author name
          {
            author: {
              fullName: { contains: word, mode: "insensitive" },
            },
          },
          // Search in tags
          {
            tags: {
              some: {
                tag: {
                  name: { contains: word, mode: "insensitive" },
                },
              },
            },
          },
        ],
      }));

      // Also search in answers content (both exact phrase and individual words)
      const answersExactCondition = {
        answers: {
          some: {
            content: { contains: searchTerm, mode: "insensitive" },
          },
        },
      };

      const answersWordConditions = searchWords.map((word) => ({
        answers: {
          some: {
            content: { contains: word, mode: "insensitive" },
          },
        },
      }));

      // Combine: exact phrase OR (all words match) OR answers match
      // This allows matching either exact phrase, all individual words, or in answers
      if (searchWords.length > 1) {
        // Multiple words: exact phrase OR all words match OR answers (exact or all words)
        andConditions.push({
          OR: [
            exactPhraseCondition,
            {
              AND: wordConditions,
            },
            answersExactCondition,
            {
              AND: answersWordConditions,
            },
          ],
        });
      } else {
        // Single word: exact phrase OR answers match
        andConditions.push({
          OR: [exactPhraseCondition, answersExactCondition],
        });
      }
    }

    // Tag filter - find questions that have any of the specified tags
    if (tagNames && tagNames.length > 0) {
      andConditions.push({
        tags: {
          some: {
            tag: {
              name: {
                in: tagNames,
                mode: "insensitive",
              },
            },
          },
        },
      });
    }

    // Category filter
    if (categoryId) {
      andConditions.push({ categoryId });
    }

    // Author filter
    if (authorId) {
      andConditions.push({ authorId });
    }

    // Status filter
    if (status) {
      andConditions.push({ status });
    }

    // Approval status filter
    if (approvalStatus) {
      andConditions.push({ approvalStatus });
    } else if (authUserRole !== "ADMIN") {
      // For non-admin users, show APPROVED + their own PENDING/REJECTED
      andConditions.push({
        OR: [
          { approvalStatus: "APPROVED" },
          ...(authUserId
            ? [
                {
                  AND: [
                    { approvalStatus: "PENDING" },
                    { authorId: authUserId },
                  ],
                },
                {
                  AND: [
                    { approvalStatus: "REJECTED" },
                    { authorId: authUserId },
                  ],
                },
              ]
            : []),
        ],
      });
    }

    // Build final where clause
    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    // Hybrid search: combine database search with vector similarity search
    let questions: any[] = [];
    let total = 0;
    const questionScoreMap = new Map<string, number>(); // Track scores for ranking

    // 1. Database full-text search
    const dbQuestions = await prisma.question.findMany({
      where,
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

    // Score database results (higher score for better matches)
    dbQuestions.forEach((q, index) => {
      let score = 1.0 - (index / Math.max(dbQuestions.length, 1)) * 0.3; // Score from 1.0 to 0.7
      questionScoreMap.set(q.id, score);
    });

    // 2. Vector similarity search (if enabled and query exists)
    let vectorQuestions: any[] = [];
    const embeddingProvider =
      process.env.EMBEDDING_PROVIDER?.toLowerCase() || "gemini";
    const hasApiKey =
      embeddingProvider === "gemini"
        ? !!process.env.GEMINI_API_KEY
        : !!process.env.OPENAI_API_KEY;

    if (useVector && query && query.trim() && hasApiKey) {
      try {
        // Generate embedding for search query (with caching)
        const startTime = Date.now();
        const queryEmbedding = await generateEmbedding(query.trim());
        const embeddingTime = Date.now() - startTime;
        console.log(`[Search] Embedding generation took ${embeddingTime}ms`);

        const embeddingString = formatEmbeddingForPostgres(queryEmbedding);

        // Build vector search query with proper parameterization
        // Use Prisma's where clause to build filters safely, then use raw query for vector similarity
        // Note: embedding field is Unsupported("vector") type, so we can't filter it via Prisma
        // The raw SQL query handles embedding IS NOT NULL check
        const vectorWhere: any = {};

        // Apply approval filter
        if (approvalStatus) {
          vectorWhere.approvalStatus = approvalStatus;
        } else if (authUserRole !== "ADMIN") {
          if (authUserId) {
            vectorWhere.OR = [
              { approvalStatus: "APPROVED" },
              {
                AND: [{ approvalStatus: "PENDING" }, { authorId: authUserId }],
              },
              {
                AND: [{ approvalStatus: "REJECTED" }, { authorId: authUserId }],
              },
            ];
          } else {
            vectorWhere.approvalStatus = "APPROVED";
          }
        }

        // Apply additional filters
        if (categoryId) {
          vectorWhere.categoryId = categoryId;
        }
        if (authorId) {
          vectorWhere.authorId = authorId;
        }
        if (status) {
          vectorWhere.status = status;
        }

        // Get question IDs that match filters (using Prisma for safety)
        const filteredQuestionIds = await prisma.question.findMany({
          where: vectorWhere,
          select: { id: true },
        });

        const questionIds = filteredQuestionIds.map((q) => q.id);

        let vectorResults: Array<{ id: string; similarity: number }> = [];

        if (questionIds.length > 0) {
          // Use Prisma's parameterized query for vector similarity search
          // Build IN clause with proper parameterization
          const placeholders = questionIds.map((_, i) => `$${i + 2}`).join(",");

          const vectorSearchStart = Date.now();
          vectorResults = await prisma.$queryRawUnsafe<
            Array<{ id: string; similarity: number }>
          >(
            `SELECT 
              q.id,
              1 - (q.embedding <=> $1::vector) as similarity
            FROM questions q
            WHERE q.id IN (${placeholders})
              AND q.embedding IS NOT NULL
            ORDER BY q.embedding <=> $1::vector
            LIMIT $${questionIds.length + 2}`,
            embeddingString,
            ...questionIds,
            limit * 2
          );
          const vectorSearchTime = Date.now() - vectorSearchStart;
          console.log(
            `[Search] Vector similarity search took ${vectorSearchTime}ms for ${questionIds.length} questions, found ${vectorResults.length} results`
          );
        }

        // Score vector results (similarity score from 0-1)
        // Lower threshold for vector results to catch more semantic matches
        const vectorThreshold = 0.5; // Lower threshold for semantic similarity
        vectorResults.forEach((result: { id: string; similarity: number }) => {
          // Only include results above threshold
          if (result.similarity >= vectorThreshold) {
            const vectorScore = result.similarity * vectorWeight;
            const existingScore = questionScoreMap.get(result.id) || 0;
            // Combine scores: add vector score to boost semantic matches
            questionScoreMap.set(result.id, existingScore + vectorScore);
          }
        });

        // Get full question details for vector results
        const vectorQuestionIds = vectorResults
          .filter(
            (r: { id: string; similarity: number }) => r.similarity >= 0.5
          )
          .map((r: { id: string; similarity: number }) => r.id);
        if (vectorQuestionIds.length > 0) {
          vectorQuestions = await prisma.question.findMany({
            where: {
              id: { in: vectorQuestionIds },
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
        }
      } catch (vectorError) {
        console.error("[Search] Vector search error:", vectorError);
        // Continue with database search only if vector search fails
      }
    }

    // 3. Merge and deduplicate results
    const allQuestionsMap = new Map<string, any>();

    // Add database results first (they have base scores)
    dbQuestions.forEach((q) => {
      allQuestionsMap.set(q.id, q);
    });

    // Add vector results (boost semantic matches)
    vectorQuestions.forEach((q) => {
      if (!allQuestionsMap.has(q.id)) {
        // New question from vector search, add with base score
        questionScoreMap.set(q.id, questionScoreMap.get(q.id) || 0.3);
        allQuestionsMap.set(q.id, q);
      }
    });

    // 4. Sort by combined score (highest first)
    // Prioritize questions that appear in both results
    questions = Array.from(allQuestionsMap.values()).sort((a, b) => {
      const scoreA = questionScoreMap.get(a.id) || 0;
      const scoreB = questionScoreMap.get(b.id) || 0;

      // If scores are equal, prioritize questions with more answers
      if (Math.abs(scoreA - scoreB) < 0.01) {
        const answersA = a._count?.answers || 0;
        const answersB = b._count?.answers || 0;
        return answersB - answersA;
      }

      return scoreB - scoreA; // Descending order
    });

    // 5. Apply pagination
    total = questions.length;
    questions = questions.slice((page - 1) * limit, page * limit);

    // Format response
    const formattedQuestions = questions.map((q) => {
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

    return NextResponse.json({
      questions: formattedQuestions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API /questions/search] Error:", error);
    return handleHttpError(error);
  }
}
