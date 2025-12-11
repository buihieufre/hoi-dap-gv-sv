import { NextRequest, NextResponse } from "next/server";
import { CategoryRepository } from "@/infrastructure/repositories/category.repository.prisma";
import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { generateSlug } from "@/shared/utils/slug";

/**
 * GET /api/categories
 * Lấy danh sách tất cả categories
 * Query params:
 * - type: SYSTEM | ACADEMIC (filter by type)
 * - approvalStatus: PENDING | APPROVED | REJECTED (filter by approval status)
 * - includePending: boolean (include pending categories for non-admin users)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const approvalStatus = searchParams.get("approvalStatus");
    const includePending = searchParams.get("includePending") === "true";

    const categoryRepository = new CategoryRepository();
    let categories = await categoryRepository.findAll();

    // Filter by type if provided
    if (type === "SYSTEM" || type === "ACADEMIC") {
      categories = categories.filter((cat: any) => cat.type === type);
    }

    // Filter by approval status
    if (
      approvalStatus === "PENDING" ||
      approvalStatus === "APPROVED" ||
      approvalStatus === "REJECTED"
    ) {
      categories = categories.filter(
        (cat: any) => cat.approvalStatus === approvalStatus
      );
    } else if (!includePending) {
      // By default, only show APPROVED categories to non-admin users
      try {
        const authUser = getAuthUser(request);
        if (authUser.role !== "ADMIN") {
          categories = categories.filter(
            (cat: any) => cat.approvalStatus === "APPROVED"
          );
        }
      } catch {
        // Not authenticated, only show APPROVED
        categories = categories.filter(
          (cat: any) => cat.approvalStatus === "APPROVED"
        );
      }
    }

    return NextResponse.json({
      categories: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        slug: cat.slug,
        type: cat.type,
        approvalStatus: cat.approvalStatus,
        authorId: cat.authorId,
        author: cat.author
          ? {
              id: cat.author.id,
              fullName: cat.author.fullName,
              email: cat.author.email,
            }
          : null,
        _count: {
          questions: (cat as any)._count?.questions ?? 0,
        },
        createdAt:
          cat.createdAt instanceof Date
            ? cat.createdAt.toISOString()
            : typeof cat.createdAt === "string"
            ? cat.createdAt
            : new Date(cat.createdAt).toISOString(),
        updatedAt:
          cat.updatedAt instanceof Date
            ? cat.updatedAt.toISOString()
            : typeof cat.updatedAt === "string"
            ? cat.updatedAt
            : new Date(cat.updatedAt).toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[API /categories] Error:", error);
    console.error("[API /categories] Error stack:", error?.stack);
    return handleHttpError(error);
  }
}

/**
 * POST /api/categories
 * Tạo category mới
 * - ADMIN: có thể tạo SYSTEM hoặc ACADEMIC categories (auto-approved)
 * - STUDENT/ADVISOR: chỉ có thể tạo ACADEMIC categories (status: PENDING)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    const body = await request.json();
    const { name, description, slug, type } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Tên danh mục là bắt buộc" },
        { status: 400 }
      );
    }

    // Auto-generate slug if not provided
    const finalSlug = slug || generateSlug(name);
    if (!finalSlug) {
      return NextResponse.json(
        { message: "Không thể tạo slug từ tên danh mục" },
        { status: 400 }
      );
    }

    const categoryRepository = new CategoryRepository();

    // Check duplicate name or slug
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug: finalSlug }],
      },
    });
    if (existingCategory) {
      return NextResponse.json(
        { message: "Tên hoặc slug danh mục đã tồn tại" },
        { status: 400 }
      );
    }

    // Validate parentId if provided
    if (body.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: body.parentId },
      });
      if (!parent) {
        return NextResponse.json(
          { message: "Danh mục cha không tồn tại" },
          { status: 404 }
        );
      }
    }

    // Determine category type and approval status
    let categoryType: "SYSTEM" | "ACADEMIC" = "ACADEMIC";
    let approvalStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
    let authorId: string | null = null;

    if (authUser.role === "ADMIN") {
      // Admin can create SYSTEM or ACADEMIC categories, both auto-approved
      categoryType = type === "SYSTEM" ? "SYSTEM" : "ACADEMIC";
      approvalStatus = "APPROVED";
      // Admin-created categories don't need authorId
    } else {
      return NextResponse.json(
        { message: "Bạn không có quyền tạo danh mục" },
        { status: 403 }
      );
    }

    // Log the data being created for debugging
    console.log("[API /categories POST] Creating category with:", {
      name,
      description: description || null,
      slug: finalSlug,
      type: categoryType,
      approvalStatus,
      authorId,
      userRole: authUser.role,
    });

    const category = await categoryRepository.create({
      name,
      description: description || null,
      slug: finalSlug,
      type: categoryType,
      approvalStatus,
      authorId,
      parentId: body.parentId || null,
    });

    console.log(
      "[API /categories POST] Category created successfully:",
      category.id
    );

    return NextResponse.json(
      {
        message:
          categoryType === "ACADEMIC" && approvalStatus === "PENDING"
            ? "Danh mục học thuật đã được tạo và đang chờ duyệt"
            : "Tạo danh mục thành công",
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          slug: category.slug,
          type: (category as any).type,
          approvalStatus: (category as any).approvalStatus,
          authorId: (category as any).authorId,
          parentId: (category as any).parentId ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /categories POST] Error creating category:", error);
    console.error("[API /categories POST] Error code:", error.code);
    console.error("[API /categories POST] Error message:", error.message);
    console.error("[API /categories POST] Error meta:", error.meta);

    if (error.code === "P2002") {
      // Unique constraint violation
      return NextResponse.json(
        { message: "Tên hoặc slug danh mục đã tồn tại" },
        { status: 400 }
      );
    }

    // More specific error messages
    if (error.message?.includes("Foreign key constraint")) {
      return NextResponse.json(
        { message: "Người dùng không tồn tại" },
        { status: 400 }
      );
    }

    return handleHttpError(error);
  }
}
