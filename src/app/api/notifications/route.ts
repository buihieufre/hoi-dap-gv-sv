import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { requireAuth, getAuthUser } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";

// GET notifications (latest 20) + unread count
export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const { userId } = getAuthUser(request);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    // Format notifications for client (ensure Date objects are serialized)
    const formattedNotifications = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      link: n.link,
      isRead: n.isRead,
      createdAt:
        n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    }));

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

// PATCH mark all read
export async function PATCH(request: NextRequest) {
  try {
    requireAuth(request);
    const { userId } = getAuthUser(request);
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    return handleHttpError(error);
  }
}
