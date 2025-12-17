/**
 * Question Repository Implementation (Prisma)
 */

import { prisma } from "@/infrastructure/database/prisma";
import { IQuestionRepository } from "@/domain/repositories/question.repository";
import { Question } from "@/domain/models/question.model";
import { QuestionStatus, ApprovalStatus } from "@/shared/types";

export class QuestionRepository implements IQuestionRepository {
  async findById(id: string): Promise<Question | null> {
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        author: true,
        category: true,
        answers: {
          include: {
            author: true,
          },
        },
      },
    });

    if (!question) return null;
    return this.toDomain(question);
  }

  async findByAuthorId(authorId: string): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: { authorId },
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
        _count: {
          select: { answers: true },
        },
      },
    });

    return questions.map((q) => this.toDomain(q));
  }

  async findByCategoryId(categoryId: string): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: { categoryId },
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
        _count: {
          select: { answers: true },
        },
      },
    });

    return questions.map((q) => this.toDomain(q));
  }

  async findByStatus(status: QuestionStatus): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: { status },
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
        _count: {
          select: { answers: true },
        },
      },
    });

    return questions.map((q) => this.toDomain(q));
  }

  async search(
    query: string,
    filters?: {
      categoryId?: string;
      status?: QuestionStatus;
      authorId?: string;
    }
  ): Promise<Question[]> {
    const where: any = {};

    // Text search
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ];
    }

    // Filters
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.authorId) {
      where.authorId = filters.authorId;
    }

    // Tags filter removed - tags table no longer exists in schema

    const questions = await prisma.question.findMany({
      where,
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
        _count: {
          select: { answers: true },
        },
      },
    });

    return questions.map((q) => this.toDomain(q));
  }

  async create(
    questionData: Omit<Question, "id" | "createdAt" | "updatedAt">
  ): Promise<Question> {
    const question = await prisma.question.create({
      data: {
        title: questionData.title,
        content: questionData.content,
        status: questionData.status,
        approvalStatus: (questionData.approvalStatus ||
          "PENDING") as ApprovalStatus,
        authorId: questionData.authorId,
        categoryId: questionData.categoryId,
        views: questionData.views || 0,
        acceptedAnswerId: questionData.acceptedAnswerId || null,
        duplicateOfId: questionData.duplicateOfId || null,
        isAnonymous: questionData.isAnonymous || false,
      },
      include: {
        author: true,
        category: true,
      },
    });

    return this.toDomain(question);
  }

  async update(id: string, data: Partial<Question>): Promise<Question> {
    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.status && { status: data.status }),
        ...(data.approvalStatus && {
          approvalStatus: data.approvalStatus as ApprovalStatus,
        }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.views !== undefined && { views: data.views }),
        ...(data.acceptedAnswerId !== undefined && {
          acceptedAnswerId: data.acceptedAnswerId,
        }),
        ...(data.duplicateOfId !== undefined && {
          duplicateOfId: data.duplicateOfId,
        }),
      },
      include: {
        author: true,
        category: true,
      },
    });

    return this.toDomain(question);
  }

  async delete(id: string): Promise<void> {
    await prisma.question.delete({ where: { id } });
  }

  async incrementViews(id: string, userId: string): Promise<boolean> {
    // Defensive check: ensure questionView model exists
    if (!("questionView" in prisma)) {
      const errorMessage = `
❌ Prisma questionView model is not available.

🔧 To fix this:
1. Stop the dev server (Ctrl+C)
2. Run: npx prisma generate
3. Restart the dev server: npm run dev

The Prisma client needs to be regenerated after adding new models.
      `.trim();
      console.error(errorMessage);

      // Try to clear cache in development
      if (
        process.env.NODE_ENV !== "production" &&
        typeof globalThis !== "undefined"
      ) {
        const globalForPrisma = globalThis as unknown as {
          prisma: typeof prisma | undefined;
        };
        if (globalForPrisma.prisma) {
          console.warn("⚠️  Attempting to clear Prisma client cache...");
          globalForPrisma.prisma.$disconnect().catch(() => {});
          globalForPrisma.prisma = undefined;
        }
      }

      throw new Error(errorMessage);
    }

    // Check if user has already viewed this question
    const existingView = await prisma.questionView.findUnique({
      where: {
        userId_questionId: {
          userId,
          questionId: id,
        },
      },
    });

    // If already viewed, don't increment
    if (existingView) {
      return false;
    }

    // Create view record and increment view count in a transaction
    await prisma.$transaction(async (tx) => {
      // Create view record
      await tx.questionView.create({
        data: {
          userId,
          questionId: id,
        },
      });

      // Increment view count
      await tx.question.update({
        where: { id },
        data: {
          views: {
            increment: 1,
          },
        },
      });
    });

    return true;
  }

  private toDomain(prismaQuestion: any): Question {
    return new Question(
      prismaQuestion.id,
      prismaQuestion.title,
      prismaQuestion.content,
      prismaQuestion.status as QuestionStatus,
      prismaQuestion.authorId,
      prismaQuestion.categoryId,
      prismaQuestion.views,
      prismaQuestion.acceptedAnswerId,
      prismaQuestion.duplicateOfId,
      (prismaQuestion.approvalStatus as ApprovalStatus) || "PENDING",
      prismaQuestion.isAnonymous || false,
      prismaQuestion.createdAt,
      prismaQuestion.updatedAt
    );
  }
}
