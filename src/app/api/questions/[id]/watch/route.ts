import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser } from "@/app/api/middleware/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(req);
    const { id: questionId } = await params;
    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Debug: Check if questionWatcher model exists
    if (!prisma.questionWatcher) {
      console.error("Prisma questionWatcher model not found!");
      return NextResponse.json(
        { error: "Database model not available. Please restart the server." },
        { status: 500 }
      );
    }

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Check if already watching
    const existing = await prisma.questionWatcher.findFirst({
      where: {
        questionId,
        userId: user.userId,
      },
    });

    if (existing) {
      return NextResponse.json({ watching: true });
    }

    // Add watcher
    await prisma.questionWatcher.create({
      data: {
        questionId,
        userId: user.userId,
      },
    });

    return NextResponse.json({ watching: true });
  } catch (error: any) {
    console.error("Error watching question:", error);
    if (error.name === "UnauthorizedError" || error.message?.includes("token")) {
      return NextResponse.json(
        { error: error.message || "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to watch question" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(req);
    const { id: questionId } = await params;
    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Remove watcher
    await prisma.questionWatcher.deleteMany({
      where: {
        questionId,
        userId: user.userId,
      },
    });

    return NextResponse.json({ watching: false });
  } catch (error: any) {
    console.error("Error unwatching question:", error);
    if (error.name === "UnauthorizedError" || error.message?.includes("token")) {
      return NextResponse.json(
        { error: error.message || "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to unwatch question" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(req);
    const { id: questionId } = await params;
    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Check if user is watching
    const watcher = await prisma.questionWatcher.findFirst({
      where: {
        questionId,
        userId: user.userId,
      },
    });

    return NextResponse.json({ watching: !!watcher });
  } catch (error: any) {
    console.error("Error checking watch status:", error);
    return NextResponse.json({ watching: false });
  }
}

