import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { handleHttpError } from "@/shared/utils/http-error";
import { getAuthUser, requireAuth } from "@/app/api/middleware/auth";
import { sendFcmMessage } from "@/infrastructure/firebase/firebase-admin";
import { getIO } from "@/shared/socket-io";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request);
    const { userId, role } = getAuthUser(request);
    let questionId = params?.id;
    if (!questionId) {
      const url = new URL(request.url);
      const parts = url.pathname.split("/").filter(Boolean);
      // .../api/questions/:id/answers
      questionId = parts[parts.length - 2];
    }

    if (!questionId) {
      return NextResponse.json(
        { message: "Thiếu questionId" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { content } = body as { content?: string | Record<string, any> };

    let contentToSave: string | null = null;
    if (typeof content === "string") {
      if (!content.trim()) {
        return NextResponse.json(
          { message: "Nội dung trả lời không được để trống" },
          { status: 400 }
        );
      }
      contentToSave = content.trim();
    } else if (content && typeof content === "object") {
      // Assume Editor.js OutputData
      if (
        Array.isArray((content as any).blocks) &&
        (content as any).blocks.length === 0
      ) {
        return NextResponse.json(
          { message: "Nội dung trả lời không được để trống" },
          { status: 400 }
        );
      }
      contentToSave = JSON.stringify(content);
    } else {
      return NextResponse.json(
        { message: "Nội dung trả lời không được để trống" },
        { status: 400 }
      );
    }

    // Verify question exists and only allow answering when APPROVED
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        title: true,
        authorId: true,
        approvalStatus: true,
      },
    });
    if (!question) {
      return NextResponse.json(
        { message: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }
    if (question.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { message: "Câu hỏi chưa được duyệt nên không thể trả lời" },
        { status: 403 }
      );
    }

    // Create answer
    const answer = await prisma.answer.create({
      data: {
        content: contentToSave,
        questionId,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    // Create notification for question owner (if different)
    if (question.authorId && question.authorId !== userId) {
      const link = `/questions/${questionId}`;
      await prisma.notification.create({
        data: {
          userId: question.authorId,
          type: "ANSWER_CREATED",
          title: "Có câu trả lời mới",
          content: `Câu hỏi "${question.title}" vừa có câu trả lời mới.`,
          link,
          meta: {
            questionId,
            answerId: answer.id,
          },
        },
      });

      // Send FCM to all tokens of question author
      const tokens = await prisma.notificationToken.findMany({
        where: { userId: question.authorId, revokedAt: null },
        select: { fcmToken: true },
      });

      await Promise.all(
        tokens.map((t) =>
          sendFcmMessage({
            token: t.fcmToken,
            notification: {
              title: "Có câu trả lời mới",
              body: question.title,
            },
            data: {
              link,
              questionId,
              answerId: answer.id,
            },
            link,
          }).catch((err) => {
            console.error("FCM send failed", err);
          })
        )
      );
    }

    // Emit realtime to question room and author room
    const io = getIO();
    if (io) {
      const payload = {
        id: answer.id,
        content: answer.content,
        author: answer.author,
        questionId,
        createdAt: answer.createdAt,
      };
      io.to(`question:${questionId}`).emit("answer:new", payload);
      if (question.authorId) {
        io.to(`user:${question.authorId}`).emit("answer:new", payload);
      }
    }

    return NextResponse.json({
      message: "Đã gửi câu trả lời",
      answer: {
        id: answer.id,
        content: answer.content,
        author: answer.author,
        questionId,
        createdAt: answer.createdAt,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
