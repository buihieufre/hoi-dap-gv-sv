import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser } from "@/app/api/middleware/auth";
import { getIO } from "@/shared/socket-io";

/**
 * PATCH /api/questions/[id]/answers/[answerId]
 * Update an answer (only once, like Messenger)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  try {
    const user = getAuthUser(req);
    const { id: questionId, answerId } = await params;

    if (!questionId || !answerId) {
      return NextResponse.json(
        { error: "Question ID and Answer ID are required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { content } = body as { content?: string | Record<string, any> };

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Get answer to check ownership and edit count
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
        question: {
          select: { id: true, approvalStatus: true },
        },
      },
    });

    if (!answer) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    }

    // Check ownership
    if (answer.authorId !== user.userId) {
      return NextResponse.json(
        { error: "You can only edit your own answers" },
        { status: 403 }
      );
    }

    // Check if already edited (max 1 edit)
    const editCount = (answer as any).editCount || 0;
    if (editCount >= 1) {
      return NextResponse.json(
        { error: "Answer can only be edited once" },
        { status: 403 }
      );
    }

    // Check question status
    if (answer.question.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Cannot edit answer for unapproved question" },
        { status: 403 }
      );
    }

    // Format content
    let contentToSave: string;
    if (typeof content === "string") {
      if (!content.trim()) {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        );
      }
      contentToSave = content.trim();
    } else if (content && typeof content === "object") {
      if (
        Array.isArray((content as any).blocks) &&
        (content as any).blocks.length === 0
      ) {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        );
      }
      contentToSave = JSON.stringify(content);
    } else {
      return NextResponse.json(
        { error: "Invalid content format" },
        { status: 400 }
      );
    }

    // Update answer: save original content, increment edit count
    const updateData: any = {
      content: contentToSave,
      editCount: 1,
      editedAt: new Date(),
    };

    // Always save originalContent before first edit (when editCount is 0 or null)
    // This ensures we preserve the original content
    if (editCount === 0 || !(answer as any).originalContent) {
      updateData.originalContent = answer.content;
      console.log(`[API] Saving originalContent for answer ${answerId}:`, answer.content.substring(0, 50));
    } else {
      // If already edited, keep existing originalContent
      updateData.originalContent = (answer as any).originalContent;
      console.log(`[API] Keeping existing originalContent for answer ${answerId}`);
    }

    console.log(`[API] Updating answer ${answerId} with data:`, {
      editCount: updateData.editCount,
      hasOriginalContent: !!updateData.originalContent,
      originalContentLength: updateData.originalContent?.length || 0,
      editedAt: updateData.editedAt,
    });

    const updatedAnswer = await prisma.answer.update({
      where: { id: answerId },
      data: updateData,
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    console.log(`[API] Answer updated successfully. Retrieved data:`, {
      editCount: (updatedAnswer as any).editCount,
      hasOriginalContent: !!(updatedAnswer as any).originalContent,
      originalContentLength: (updatedAnswer as any).originalContent?.length || 0,
      editedAt: (updatedAnswer as any).editedAt,
    });

    // Emit socket event to update clients
    const io = getIO();
    if (io) {
      const answerData = updatedAnswer as any;
      io.to(`question:${questionId}`).emit("answer:updated", {
        id: updatedAnswer.id,
        content: updatedAnswer.content,
        author: updatedAnswer.author,
        editCount: answerData.editCount ?? 1,
        editedAt:
          answerData.editedAt?.toISOString() || new Date().toISOString(),
        originalContent: answerData.originalContent ?? null, // Include originalContent (can be null)
        questionId,
      });
    }

    const answerData = updatedAnswer as any;
    return NextResponse.json({
      message: "Answer updated successfully",
      answer: {
        id: updatedAnswer.id,
        content: updatedAnswer.content,
        author: updatedAnswer.author,
        editCount: answerData.editCount ?? 1,
        editedAt:
          answerData.editedAt?.toISOString() || new Date().toISOString(),
        originalContent: answerData.originalContent ?? null, // Return originalContent (can be null)
      },
    });
  } catch (error: any) {
    console.error("Error updating answer:", error);
    if (
      error.name === "UnauthorizedError" ||
      error.message?.includes("token")
    ) {
      return NextResponse.json(
        { error: error.message || "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update answer" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/questions/[id]/answers/[answerId]
 * Delete an answer (with confirmation on client side)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  try {
    const user = getAuthUser(req);
    const { id: questionId, answerId } = await params;

    if (!questionId || !answerId) {
      return NextResponse.json(
        { error: "Question ID and Answer ID are required" },
        { status: 400 }
      );
    }

    // Get answer to check ownership
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        question: {
          select: { id: true, approvalStatus: true },
        },
      },
    });

    if (!answer) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    }

    // Check ownership (only author can delete)
    if (answer.authorId !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You can only delete your own answers" },
        { status: 403 }
      );
    }

    // Delete answer
    await prisma.answer.delete({
      where: { id: answerId },
    });

    // Emit socket event to remove from clients
    const io = getIO();
    if (io) {
      io.to(`question:${questionId}`).emit("answer:deleted", {
        id: answerId,
        questionId,
      });
    }

    return NextResponse.json({
      message: "Answer deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting answer:", error);
    if (
      error.name === "UnauthorizedError" ||
      error.message?.includes("token")
    ) {
      return NextResponse.json(
        { error: error.message || "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete answer" },
      { status: 500 }
    );
  }
}
