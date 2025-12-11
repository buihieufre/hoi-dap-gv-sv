import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAuth } from "@/app/api/middleware/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { handleHttpError } from "@/shared/utils/http-error";

/**
 * POST /api/notifications/token
 * Body: { fcmToken: string; userAgent?: string }
 * Save or update FCM token for current user.
 */
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { userId } = getAuthUser(request);
    const body = await request.json();
    const { fcmToken, userAgent } = body || {};

    if (!fcmToken || typeof fcmToken !== "string") {
      return NextResponse.json(
        { message: "fcmToken is required" },
        { status: 400 }
      );
    }

    // Remove existing token (unique) then create
    await prisma.notificationToken.upsert({
      where: { fcmToken },
      update: {
        userId,
        userAgent: userAgent || null,
        revokedAt: null,
      },
      create: {
        fcmToken,
        userId,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ message: "Token saved" });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * DELETE /api/notifications/token
 * Body: { fcmToken: string }
 * Remove FCM token for current user.
 */
export async function DELETE(request: NextRequest) {
  try {
    requireAuth(request);
    const { userId } = getAuthUser(request);
    const body = await request.json();
    const { fcmToken } = body || {};

    if (!fcmToken || typeof fcmToken !== "string") {
      return NextResponse.json(
        { message: "fcmToken is required" },
        { status: 400 }
      );
    }

    await prisma.notificationToken.deleteMany({
      where: {
        fcmToken,
        userId,
      },
    });

    return NextResponse.json({ message: "Token removed" });
  } catch (error) {
    return handleHttpError(error);
  }
}

