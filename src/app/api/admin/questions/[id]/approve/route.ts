import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { QuestionRepository } from "@/infrastructure/repositories/question.repository.prisma";
import { ApprovalStatus } from "@/shared/types";
import { prisma } from "@/infrastructure/database/prisma";
import { getIO } from "@/shared/socket-io";
import { sendFcmMessage } from "@/infrastructure/firebase/firebase-admin";

/**
 * POST /api/admin/questions/[id]/approve
 * Duyệt câu hỏi (chỉ ADMIN)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ["ADMIN"]);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "ID câu hỏi không hợp lệ" },
        { status: 400 }
      );
    }

    const questionRepository = new QuestionRepository();
    const question = await questionRepository.findById(id);

    if (!question) {
      return NextResponse.json(
        { message: "Câu hỏi không tồn tại" },
        { status: 404 }
      );
    }

    // Update approval status to APPROVED
    const updatedQuestion = await questionRepository.update(id, {
      approvalStatus: "APPROVED" as ApprovalStatus,
    });

    // Send notification to question author
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: question.authorId,
          type: "QUESTION_APPROVED",
          title: "Câu hỏi đã được duyệt",
          content: `Câu hỏi "${question.title}" của bạn đã được duyệt và hiển thị công khai.`,
          link: `/questions/${question.id}`,
          questionId: question.id,
        },
      });

      // Emit socket notification
      const io = getIO();
      if (io) {
        io.to(`user:${question.authorId}`).emit("notification:new", {
          id: notification.id,
          title: notification.title,
          content: notification.content,
          link: notification.link,
          createdAt: notification.createdAt.toISOString(),
        });
      }

      // Send FCM push notification
      const tokens = await prisma.notificationToken.findMany({
        where: { userId: question.authorId, revokedAt: null },
        select: { fcmToken: true },
      });

      await Promise.allSettled(
        tokens.map((t) =>
          sendFcmMessage({
            token: t.fcmToken,
            notification: {
              title: "Câu hỏi đã được duyệt",
              body: `Câu hỏi "${question.title}" của bạn đã được duyệt.`,
            },
            data: {
              link: `/questions/${question.id}`,
              questionId: question.id,
              notificationId: notification.id,
            },
            link: `/questions/${question.id}`,
          }).catch((err) =>
            console.error(
              `[API /admin/questions/approve] FCM send failed:`,
              err
            )
          )
        )
      );
    } catch (notifError) {
      console.error(
        "[API /admin/questions/approve] Error sending notification:",
        notifError
      );
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      message: "Đã duyệt câu hỏi thành công",
      question: {
        id: updatedQuestion.id,
        title: updatedQuestion.title,
        approvalStatus: updatedQuestion.approvalStatus,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
