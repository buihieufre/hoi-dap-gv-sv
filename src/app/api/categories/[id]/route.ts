import { NextRequest, NextResponse } from "next/server";
import { CategoryRepository } from "@/infrastructure/repositories/category.repository.prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";

/**
 * GET /api/categories/[id]
 * Lấy chi tiết một category
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * PATCH /api/categories/[id]
 * Cập nhật category (chỉ ADMIN)
 */
export async function PATCH(
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

    const body = await request.json();
    const { name, description, slug } = body;

    const categoryRepository = new CategoryRepository();
    const existingCategory = await categoryRepository.findById(id);

    if (!existingCategory) {
      return NextResponse.json(
        { message: "Không tìm thấy danh mục" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (slug) updateData.slug = slug;

    const updatedCategory = await categoryRepository.update(id, updateData);

    return NextResponse.json({
      message: "Cập nhật danh mục thành công",
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        slug: updatedCategory.slug,
        updatedAt: updatedCategory.updatedAt,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * DELETE /api/categories/[id]
 * Xóa category (chỉ ADMIN)
 */
export async function DELETE(
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

    await categoryRepository.delete(id);

    return NextResponse.json({
      message: "Xóa danh mục thành công",
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

