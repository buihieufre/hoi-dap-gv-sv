import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { prisma } from "@/infrastructure/database/prisma";

/**
 * GET /api/stats
 * Lấy thống kê của user hiện tại (Tối ưu với Promise.all)
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    const userId = authUser.userId;
    const isAdvisorOrAdmin =
      authUser.role === "ADVISOR" || authUser.role === "ADMIN";

    // Tối ưu: Chạy tất cả các queries song song với Promise.all
    const [
      myQuestionsCount,
      answeredQuestionsCount,
      openQuestionsCount,
      totalQuestionsCount,
      myAnswersCount,
      unansweredQuestionsCount,
    ] = await Promise.all([
      // Đếm tổng số câu hỏi của user
      prisma.question.count({
        where: { authorId: userId },
      }),
      // Đếm số câu hỏi đã trả lời của user
      prisma.question.count({
        where: {
          authorId: userId,
          status: "ANSWERED",
        },
      }),
      // Đếm số câu hỏi đang chờ trả lời của user
      prisma.question.count({
        where: {
          authorId: userId,
          status: "OPEN",
        },
      }),
      // Đếm tổng số câu hỏi trong hệ thống
      prisma.question.count(),
      // Đếm số câu trả lời của user (chỉ nếu là advisor/admin)
      isAdvisorOrAdmin
        ? prisma.answer.count({
            where: { authorId: userId },
          })
        : Promise.resolve(0),
      // Đếm số câu hỏi chưa trả lời (chỉ nếu là advisor/admin)
      isAdvisorOrAdmin
        ? prisma.question.count({
            where: { status: "OPEN" },
          })
        : Promise.resolve(0),
    ]);

    return NextResponse.json({
      myQuestions: myQuestionsCount,
      answeredQuestions: answeredQuestionsCount,
      openQuestions: openQuestionsCount,
      totalQuestions: totalQuestionsCount,
      myAnswers: myAnswersCount,
      unansweredQuestions: unansweredQuestionsCount,
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
