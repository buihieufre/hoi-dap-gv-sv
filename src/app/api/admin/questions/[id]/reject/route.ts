import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { QuestionRepository } from "@/infrastructure/repositories/question.repository.prisma";
import { ApprovalStatus } from "@/shared/types";
import { prisma } from "@/infrastructure/database/prisma";
import { getIO } from "@/shared/socket-io";
import { sendFcmMessage } from "@/infrastructure/firebase/firebase-admin";

/**
 * POST /api/admin/questions/[id]/reject
 * Từ chối câu hỏi (chỉ ADMIN)
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

    // Get rejection reason from request body
    const body = await request.json().catch(() => ({}));
    const rejectionReason = body.rejectionReason?.trim() || "";

    if (!rejectionReason) {
      return NextResponse.json(
        { message: "Lý do từ chối là bắt buộc" },
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

    // Update approval status to REJECTED with rejection reason
    // Use raw query to ensure the field is updated correctly (works even if Prisma client cache is stale)
    await prisma.$executeRaw`
      UPDATE questions 
      SET "approvalStatus" = 'REJECTED', "rejectionReason" = ${rejectionReason}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    // Fetch updated question
    const updatedQuestion = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        approvalStatus: true,
      },
    });

    if (!updatedQuestion) {
      return NextResponse.json(
        { message: "Không thể cập nhật câu hỏi" },
        { status: 500 }
      );
    }

    // Send notification to question author with rejection reason
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: question.authorId,
          type: "QUESTION_REJECTED",
          title: "Câu hỏi đã bị từ chối",
          content: `Câu hỏi "${question.title}" của bạn đã bị từ chối. Lý do: ${rejectionReason}`,
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
              title: "Câu hỏi đã bị từ chối",
              body: `Câu hỏi "${question.title}" của bạn đã bị từ chối.`,
            },
            data: {
              link: `/questions/${question.id}`,
              questionId: question.id,
              notificationId: notification.id,
              rejectionReason,
            },
            link: `/questions/${question.id}`,
          }).catch((err) =>
            console.error(`[API /admin/questions/reject] FCM send failed:`, err)
          )
        )
      );
    } catch (notifError) {
      console.error(
        "[API /admin/questions/reject] Error sending notification:",
        notifError
      );
      // Don't fail the request if notification fails
    }

    // Fetch rejectionReason separately using raw query if needed
    const questionWithReason = await prisma.$queryRaw<
      Array<{ rejectionReason: string | null }>
    >`
      SELECT "rejectionReason" FROM questions WHERE id = ${id}
    `;

    return NextResponse.json({
      message: "Đã từ chối câu hỏi",
      question: {
        id: updatedQuestion.id,
        title: updatedQuestion.title,
        approvalStatus: updatedQuestion.approvalStatus,
        rejectionReason:
          questionWithReason[0]?.rejectionReason || rejectionReason,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
