import { NextRequest, NextResponse } from "next/server";
import { QuestionRepository } from "@/infrastructure/repositories/question.repository.prisma";
import { handleHttpError } from "@/shared/utils/http-error";
import { getAuthUser } from "@/app/api/middleware/auth";

/**
 * POST /api/questions/[id]/view
 * Tăng lượt xem của câu hỏi (chỉ tăng một lần cho mỗi user)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "ID câu hỏi không hợp lệ" },
        { status: 400 }
      );
    }

    // Require authentication to track views
    // This ensures we can track who viewed the question
    const authUser = getAuthUser(request);
    const userId = authUser.userId;

    if (!userId) {
      return NextResponse.json(
        { message: "Cần đăng nhập để xem câu hỏi" },
        { status: 401 }
      );
    }

    const questionRepository = new QuestionRepository();
    const wasIncremented = await questionRepository.incrementViews(id, userId);

    return NextResponse.json({
      message: wasIncremented
        ? "Đã tăng lượt xem"
        : "Đã xem câu hỏi này trước đó",
      incremented: wasIncremented,
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
