import { NextRequest, NextResponse } from "next/server";
import { requireRole, getAuthUser } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { prisma } from "@/infrastructure/database/prisma";
import { sendFcmMessage } from "@/infrastructure/firebase/firebase-admin";

/**
 * POST /api/notifications/test
 * Admin only. Send a test notification to a token (or first token of current user).
 * Body: { title?: string; body?: string; token?: string; link?: string }
 */
export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const { userId } = getAuthUser(request);
    const body = await request.json();
    const { title, body: nBody, token, link } = body || {};

    let targetToken = token as string | undefined;
    if (!targetToken) {
      const found = await prisma.notificationToken.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { fcmToken: true },
      });
      if (!found) {
        return NextResponse.json(
          { message: "No token found for current user. Provide token in request body." },
          { status: 400 }
        );
      }
      targetToken = found.fcmToken;
    }

    await sendFcmMessage({
      token: targetToken,
      notification: {
        title: title || "Test notification",
        body: nBody || "This is a test push notification",
      },
      data: link ? { link } : undefined,
      link,
    });

    return NextResponse.json({ message: "Test notification sent", token: targetToken });
  } catch (error) {
    return handleHttpError(error);
  }
}

