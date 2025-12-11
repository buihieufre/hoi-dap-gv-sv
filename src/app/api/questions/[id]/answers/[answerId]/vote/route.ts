import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/middleware/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { handleHttpError } from "@/shared/utils/http-error";

/**
 * POST /api/questions/[id]/answers/[answerId]/vote
 * Toggle upvote for an answer by the current user.
 * Returns the new votesCount and current state (added/removed).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  try {
    const { id: questionId, answerId } = await params;
    const auth = getAuthUser(request);

    // Validate answer belongs to question
    const answer = await prisma.answer.findFirst({
      where: { id: answerId, questionId },
    });

    if (!answer) {
      return NextResponse.json(
        { message: "Không tìm thấy câu trả lời" },
        { status: 404 }
      );
    }

    // Check existing vote
    const existing = await prisma.vote.findFirst({
      where: {
        userId: auth.userId,
        answerId,
      },
    });

    let action: "added" | "removed" = "added";

    if (existing) {
      // Remove vote (toggle off)
      await prisma.vote.delete({
        where: { id: existing.id },
      });
      action = "removed";
    } else {
      await prisma.vote.create({
        data: {
          type: "UPVOTE",
          userId: auth.userId,
          answerId,
        },
      });
    }

    // New vote count
    const votesCount = await prisma.vote.count({
      where: { answerId },
    });

    return NextResponse.json({
      action,
      votesCount,
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

