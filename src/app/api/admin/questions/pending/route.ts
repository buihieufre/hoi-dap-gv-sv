import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { QuestionRepository } from "@/infrastructure/repositories/question.repository.prisma";
import { prisma } from "@/infrastructure/database/prisma";

/**
 * GET /api/admin/questions/pending
 * Lấy danh sách câu hỏi chờ duyệt (chỉ ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);

    const questions = await prisma.question.findMany({
      where: {
        approvalStatus: "PENDING",
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
        _count: {
          select: {
            answers: true,
          },
        },
      },
    });

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        title: q.title,
        content: q.content,
        status: q.status,
        approvalStatus: q.approvalStatus,
        author: q.author,
        category: q.category,
        views: q.views,
        answersCount: q._count.answers,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
