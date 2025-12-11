import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { uploadToCloudinary, deleteFromCloudinary } from "@/shared/utils/cloudinary";

/**
 * GET /api/resources/[id]
 * Lấy chi tiết một tài liệu
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let isAdmin = false;
    try {
      const authUser = getAuthUser(request);
      isAdmin = authUser.role === "ADMIN";
    } catch (e) {
      // Not authenticated
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!resource) {
      return NextResponse.json(
        { message: "Không tìm thấy tài liệu" },
        { status: 404 }
      );
    }

    // Non-admin can only see published resources
    if (!isAdmin && !resource.isPublished) {
      return NextResponse.json(
        { message: "Không tìm thấy tài liệu" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type,
        url: resource.url,
        fileName: resource.fileName,
        fileSize: resource.fileSize,
        mimeType: resource.mimeType,
        isPublished: resource.isPublished,
        author: resource.author,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * PUT /api/resources/[id]
 * Cập nhật tài liệu (chỉ Admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication and authorization
    getAuthUser(request);
    requireRole(request, ["ADMIN"]);

    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return NextResponse.json(
        { message: "Không tìm thấy tài liệu" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, type, url, isPublished, fileBase64, fileName, mimeType } = body;

    let finalUrl = url ?? resource.url;
    let finalFileName = fileName ?? resource.fileName;
    let finalFileSize = resource.fileSize;
    let finalMimeType = mimeType ?? resource.mimeType;

    // Handle file upload if provided
    if (fileBase64 && (type === "FILE" || type === "DOCUMENT")) {
      try {
        // Delete old file from Cloudinary if exists
        if (resource.url && resource.url.includes("cloudinary")) {
          try {
            await deleteFromCloudinary(resource.url);
          } catch (deleteError) {
            console.warn("[Resources] Could not delete old file:", deleteError);
          }
        }

        // Upload new file with proper resource type based on mimeType
        const uploadResult = await uploadToCloudinary(fileBase64, "resources", mimeType);
        finalUrl = uploadResult.secure_url;
        finalFileSize = Math.round(fileBase64.length * 0.75);
      } catch (uploadError) {
        console.error("[Resources] Upload error:", uploadError);
        return NextResponse.json(
          {
            message: "Lỗi khi tải file lên",
            error: uploadError instanceof Error ? uploadError.message : "Upload failed",
          },
          { status: 500 }
        );
      }
    }

    const updatedResource = await prisma.resource.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(type && { type }),
        url: finalUrl,
        fileName: finalFileName,
        fileSize: finalFileSize,
        mimeType: finalMimeType,
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Cập nhật tài liệu thành công",
      resource: {
        id: updatedResource.id,
        title: updatedResource.title,
        description: updatedResource.description,
        type: updatedResource.type,
        url: updatedResource.url,
        fileName: updatedResource.fileName,
        fileSize: updatedResource.fileSize,
        mimeType: updatedResource.mimeType,
        isPublished: updatedResource.isPublished,
        author: updatedResource.author,
        createdAt: updatedResource.createdAt,
        updatedAt: updatedResource.updatedAt,
      },
    });
  } catch (error) {
    console.error("[API /resources/[id] PUT] Error:", error);
    return handleHttpError(error);
  }
}

/**
 * DELETE /api/resources/[id]
 * Xóa tài liệu (chỉ Admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication and authorization
    getAuthUser(request);
    requireRole(request, ["ADMIN"]);

    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return NextResponse.json(
        { message: "Không tìm thấy tài liệu" },
        { status: 404 }
      );
    }

    // Delete file from Cloudinary if exists
    if (resource.url && resource.url.includes("cloudinary")) {
      try {
        await deleteFromCloudinary(resource.url);
      } catch (deleteError) {
        console.warn("[Resources] Could not delete file from Cloudinary:", deleteError);
      }
    }

    await prisma.resource.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Xóa tài liệu thành công",
    });
  } catch (error) {
    console.error("[API /resources/[id] DELETE] Error:", error);
    return handleHttpError(error);
  }
}

