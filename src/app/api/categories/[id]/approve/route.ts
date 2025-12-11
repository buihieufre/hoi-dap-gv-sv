import { NextRequest, NextResponse } from "next/server";
import { CategoryRepository } from "@/infrastructure/repositories/category.repository.prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";

/**
 * POST /api/categories/[id]/approve
 * Approve a pending academic category (ADMIN only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    requireRole(request, ["ADMIN"]);

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "ID danh mục không hợp lệ" },
        { status: 400 }
      );
    }

    const categoryRepository = new CategoryRepository();
    const category = await categoryRepository.findById(id);

    if (!category) {
      return NextResponse.json(
        { message: "Không tìm thấy danh mục" },
        { status: 404 }
      );
    }

    const categoryData = category as any;
    if (categoryData.approvalStatus !== "PENDING") {
      return NextResponse.json(
        { message: "Chỉ có thể duyệt danh mục đang chờ duyệt" },
        { status: 400 }
      );
    }

    const updatedCategory = await categoryRepository.update(id, {
      approvalStatus: "APPROVED",
    } as any);

    return NextResponse.json({
      message: "Duyệt danh mục thành công",
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        slug: updatedCategory.slug,
        type: (updatedCategory as any).type,
        approvalStatus: (updatedCategory as any).approvalStatus,
        authorId: (updatedCategory as any).authorId,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

