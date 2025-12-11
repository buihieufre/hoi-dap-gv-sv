import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser, requireAuth } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { getIO } from "@/shared/socket-io";
import { sendFcmMessage } from "@/infrastructure/firebase/firebase-admin";

const PAGE_SIZE = 20;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request);
    const { id: questionId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const take = PAGE_SIZE;
    const skip = (page - 1) * take;

    const messages = await prisma.questionMessage.findMany({
      where: { questionId },
      orderBy: { createdAt: "asc" },
      skip,
      take,
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return handleHttpError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request);
    const { userId, role } = getAuthUser(request);
    const { id: questionId } = params;
    const body = await request.json().catch(() => ({}));
    const { content } = body as { content?: any };

    if (!questionId) {
      return NextResponse.json({ message: "Thiếu questionId" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json(
        { message: "Nội dung không được để trống" },
        { status: 400 }
      );
    }

    // Fetch question, author, and first advisor/admin who answered
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        title: true,
        authorId: true,
      },
    });
    if (!question) {
      return NextResponse.json({ message: "Không tìm thấy câu hỏi" }, { status: 404 });
    }

    const firstAdvisorAnswer = await prisma.answer.findFirst({
      where: {
        questionId,
        author: { role: { in: ["ADVISOR", "ADMIN"] } },
      },
      orderBy: { createdAt: "asc" },
      select: { authorId: true },
    });

    // Create message
    const message = await prisma.questionMessage.create({
      data: {
        questionId,
        senderId: userId,
        content,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Determine recipients
    const recipients = new Set<string>();
    if (userId !== question.authorId) {
      recipients.add(question.authorId);
    }
    if (firstAdvisorAnswer?.authorId && firstAdvisorAnswer.authorId !== userId) {
      // If sender is student, ensure advisor who answered first gets notified
      if (role === "STUDENT") recipients.add(firstAdvisorAnswer.authorId);
    }
    // Also notify question author when advisor/admin sends
    if ((role === "ADVISOR" || role === "ADMIN") && userId !== question.authorId) {
      recipients.add(question.authorId);
    }

    // Create notifications + push
    const link = `/questions/${questionId}`;
    await Promise.all(
      Array.from(recipients).map(async (uid) => {
        await prisma.notification.create({
          data: {
            userId: uid,
            type: "MESSAGE_CREATED",
            title: "Tin nhắn mới",
            content: `Câu hỏi "${question.title}" có tin nhắn mới`,
            link,
            meta: { questionId, messageId: message.id },
          },
        });
        const tokens = await prisma.notificationToken.findMany({
          where: { userId: uid, revokedAt: null },
          select: { fcmToken: true },
        });
        await Promise.all(
          tokens.map((t) =>
            sendFcmMessage({
              token: t.fcmToken,
              notification: { title: "Tin nhắn mới", body: question.title },
              data: { link, questionId, messageId: message.id },
              link,
            }).catch((err) => console.error("FCM send failed", err))
          )
        );
      })
    );

    // Emit socket events
    const io = getIO();
    if (io) {
      io.to(`question:${questionId}`).emit("message:new", {
        id: message.id,
        questionId,
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt,
      });
      recipients.forEach((uid) => {
        io.to(`user:${uid}`).emit("notification:new", {
          type: "MESSAGE_CREATED",
          title: "Tin nhắn mới",
          body: question.title,
          link,
          meta: { questionId, messageId: message.id },
        });
      });
    }

    return NextResponse.json({ message });
  } catch (error) {
    return handleHttpError(error);
  }
}

