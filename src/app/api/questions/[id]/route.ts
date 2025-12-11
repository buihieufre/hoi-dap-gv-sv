import { NextRequest, NextResponse } from "next/server";
import { GetQuestionUseCase } from "@/usecase/question/get-question.usecase";
import { QuestionRepository } from "@/infrastructure/repositories/question.repository.prisma";
import { handleHttpError } from "@/shared/utils/http-error";
import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { QuestionStatus } from "@/shared/types";

/**
 * GET /api/questions/[id]
 * Lấy chi tiết một câu hỏi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate id
    if (!id) {
      return NextResponse.json(
        { message: "ID câu hỏi không hợp lệ" },
        { status: 400 }
      );
    }

    const questionRepository = new QuestionRepository();
    const getQuestionUseCase = new GetQuestionUseCase(questionRepository);

    // Don't increment views here - it will be done separately by the client via /api/questions/[id]/view
    const question = await getQuestionUseCase.execute(id);

    // Get full details with relations
    const prismaQuestion = await prisma.question.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        answers: {
          include: {
            author: {
              select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
            _count: {
              select: { votes: true },
            },
          },
          orderBy: [
            { isPinned: "desc" },
            { votes: { _count: "desc" } },
            { createdAt: "asc" },
          ],
        },
        _count: {
          select: {
            answers: true,
            votes: true,
            comments: true,
          },
        },
      },
    });

    if (!prismaQuestion) {
      return NextResponse.json(
        { message: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    // Check approval status: REJECTED questions only visible to author or admin
    // PENDING questions only visible to author or admin
    // APPROVED questions visible to everyone
    if (
      prismaQuestion.approvalStatus === "REJECTED" ||
      prismaQuestion.approvalStatus === "PENDING"
    ) {
      // Check if user is authenticated and is the author or admin
      try {
        const authUser = getAuthUser(request);
        // Admin can see all questions, including rejected/pending from others
        if (authUser.role === "ADMIN") {
          // Admin can see everything, continue
        } else if (authUser.userId !== prismaQuestion.authorId) {
          // Not the author and not admin, hide rejected/pending questions
          return NextResponse.json(
            { message: "Không tìm thấy câu hỏi" },
            { status: 404 }
          );
        }
      } catch (e) {
        // Not authenticated, hide rejected/pending questions
        return NextResponse.json(
          { message: "Không tìm thấy câu hỏi" },
          { status: 404 }
        );
      }
    }

    // Get auth user to determine if author should be hidden
    let viewerUserId: string | undefined;
    let viewerUserRole: string | undefined;
    try {
      const authUser = getAuthUser(request);
      viewerUserId = authUser.userId;
      viewerUserRole = authUser.role;
    } catch (e) {
      // Not authenticated
    }

    // Determine if author should be hidden (anonymous question viewed by student who is not the author)
    const isAnonymous = (prismaQuestion as any).isAnonymous || false;
    const shouldHideAuthor =
      isAnonymous &&
      viewerUserRole === "STUDENT" &&
      viewerUserId !== prismaQuestion.authorId;

    const authorInfo = shouldHideAuthor
      ? {
          id: "anonymous",
          fullName: "Người dùng ẩn danh",
          email: "",
          role: "STUDENT",
        }
      : prismaQuestion.author;

    const highestVoteCount =
      prismaQuestion.answers.reduce(
        (max, a) => Math.max(max, a._count.votes || 0),
        0
      ) || 0;

    return NextResponse.json({
      question: {
        id: question.id,
        title: question.title,
        content: question.content,
        status: question.status,
        approvalStatus: prismaQuestion.approvalStatus,
        rejectionReason: (prismaQuestion as any).rejectionReason || null,
        isAnonymous: isAnonymous,
        author: authorInfo,
        category: prismaQuestion.category,
        categories: (prismaQuestion.categories || []).map(
          (qc: any) => qc.category
        ),
        tags: prismaQuestion.tags.map((qt) => qt.tag),
        views: question.views,
        answersCount: prismaQuestion._count.answers,
        votesCount: prismaQuestion._count.votes,
        commentsCount: prismaQuestion._count.comments,
        acceptedAnswerId: question.acceptedAnswerId,
        duplicateOfId: question.duplicateOfId,
        answers: prismaQuestion.answers.map((answer) => ({
          id: answer.id,
          content: answer.content,
          isPinned: answer.isPinned,
          editCount: (answer as any).editCount || 0,
          originalContent: (answer as any).originalContent || null,
          editedAt: (answer as any).editedAt || null,
          author: answer.author,
          votesCount: answer._count.votes,
          isTopVoted:
            (answer._count.votes || 0) > 0 &&
            answer._count.votes === highestVoteCount,
          createdAt: answer.createdAt,
          updatedAt: answer.updatedAt,
        })),
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * PATCH /api/questions/[id]
 * - Cập nhật nội dung: chỉ tác giả được chỉnh sửa title/content
 * - Cập nhật trạng thái: chỉ ADVISOR hoặc ADMIN
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const questionRepository = new QuestionRepository();
    const question = await questionRepository.findById(id);
    if (!question) {
      return NextResponse.json({ message: "Không tìm thấy câu hỏi" }, { status: 404 });
    }

    const authUser = getAuthUser(request);

    const updates: any = {};
    const wantsContentUpdate = body.title || body.content;
    const wantsStatusUpdate = body.status;

    // Validate status if provided
    if (wantsStatusUpdate) {
      const status = body.status as QuestionStatus;
      const allowedStatuses: QuestionStatus[] = ["OPEN", "ANSWERED", "CLOSED", "DUPLICATE"];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
      }
      // Only ADVISOR or ADMIN can update status
      requireRole(request, ["ADVISOR", "ADMIN"]);
      updates.status = status;
    }

    // Content/title update: only author
    if (wantsContentUpdate) {
      if (authUser.userId !== question.authorId) {
        return NextResponse.json(
          { message: "Bạn không có quyền chỉnh sửa nội dung câu hỏi" },
          { status: 403 }
        );
      }
      if (body.title) updates.title = String(body.title).trim();
      if (body.content) updates.content = String(body.content).trim();
    }

    if (!wantsContentUpdate && !wantsStatusUpdate) {
      return NextResponse.json({ message: "Không có dữ liệu để cập nhật" }, { status: 400 });
    }

    const updated = await questionRepository.update(id, updates);

    return NextResponse.json(
      {
        message: "Cập nhật câu hỏi thành công",
        question: {
          id: updated.id,
          title: updated.title,
          content: updated.content,
          status: updated.status,
          authorId: updated.authorId,
          updatedAt: updated.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * DELETE /api/questions/[id]
 * - Chỉ ADMIN được xóa câu hỏi
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    requireRole(request, ["ADMIN"]);

    const questionRepository = new QuestionRepository();
    const question = await questionRepository.findById(id);
    if (!question) {
      return NextResponse.json({ message: "Không tìm thấy câu hỏi" }, { status: 404 });
    }

    await questionRepository.delete(id);
    return NextResponse.json({ message: "Xóa câu hỏi thành công" }, { status: 200 });
  } catch (error) {
    return handleHttpError(error);
  }
}
