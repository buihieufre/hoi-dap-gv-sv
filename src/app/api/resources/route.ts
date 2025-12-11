import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { uploadToCloudinary } from "@/shared/utils/cloudinary";

/**
 * GET /api/resources
 * Lấy danh sách tài liệu tham khảo
 * - Admin: xem tất cả
 * - Student/Advisor: chỉ xem tài liệu đã published
 */
export async function GET(request: NextRequest) {
  try {
    let isAdmin = false;
    try {
      const authUser = getAuthUser(request);
      isAdmin = authUser.role === "ADMIN";
    } catch (e) {
      // Not authenticated, only show published
    }

    const resources = await prisma.resource.findMany({
      where: isAdmin ? {} : { isPublished: true },
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      resources: resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        type: r.type,
        url: r.url,
        fileName: r.fileName,
        fileSize: r.fileSize,
        mimeType: r.mimeType,
        isPublished: r.isPublished,
        author: r.author,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * POST /api/resources
 * Tạo tài liệu mới (chỉ Admin)
 * Body:
 * - title: string
 * - description?: string
 * - type: LINK | FILE | DOCUMENT
 * - url?: string (for LINK type)
 * - file?: base64 (for FILE/DOCUMENT type)
 * - fileName?: string
 * - isPublished?: boolean
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authUser = getAuthUser(request);
    requireRole(request, ["ADMIN"]);

    const contentType = request.headers.get("content-type") || "";
    let body: any;

    // Handle both JSON and FormData
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        type: formData.get("type") as string,
        url: formData.get("url") as string,
        isPublished: formData.get("isPublished") === "true",
        file: formData.get("file") as File | null,
      };
    } else {
      body = await request.json();
    }

    const { title, description, type, url, isPublished = true, file, fileBase64, fileName, mimeType } = body;

    // Validation
    if (!title || !type) {
      return NextResponse.json(
        { message: "Title và type là bắt buộc" },
        { status: 400 }
      );
    }

    if (!["LINK", "FILE", "DOCUMENT"].includes(type)) {
      return NextResponse.json(
        { message: "Type phải là LINK, FILE hoặc DOCUMENT" },
        { status: 400 }
      );
    }

    let finalUrl = url;
    let finalFileName = fileName;
    let finalFileSize: number | null = null;
    let finalMimeType = mimeType;

    // If type is FILE or DOCUMENT, handle file upload
    if ((type === "FILE" || type === "DOCUMENT") && (file || fileBase64)) {
      try {
        let uploadResult;
        
        if (file && file instanceof File) {
          // Handle File object from FormData
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64 = buffer.toString("base64");
          const dataUri = `data:${file.type};base64,${base64}`;
          
          uploadResult = await uploadToCloudinary(dataUri, "resources", file.type);
          finalFileName = file.name;
          finalFileSize = file.size;
          finalMimeType = file.type;
        } else if (fileBase64) {
          // Handle base64 string - pass mimeType if available
          uploadResult = await uploadToCloudinary(fileBase64, "resources", mimeType);
          finalFileSize = Math.round(fileBase64.length * 0.75); // Approximate size
        }
        
        if (uploadResult) {
          finalUrl = uploadResult.secure_url;
        }
      } catch (uploadError) {
        console.error("[Resources] Upload error:", uploadError);
        return NextResponse.json(
          { 
            message: "Lỗi khi tải file lên",
            error: uploadError instanceof Error ? uploadError.message : "Upload failed"
          },
          { status: 500 }
        );
      }
    }

    // For LINK type, URL is required
    if (type === "LINK" && !finalUrl) {
      return NextResponse.json(
        { message: "URL là bắt buộc cho loại LINK" },
        { status: 400 }
      );
    }

    // Create resource
    const resource = await prisma.resource.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type,
        url: finalUrl || "",
        fileName: finalFileName || null,
        fileSize: finalFileSize,
        mimeType: finalMimeType || null,
        isPublished,
        authorId: authUser.userId,
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

    return NextResponse.json(
      {
        message: "Tạo tài liệu thành công",
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API /resources POST] Error:", error);
    return handleHttpError(error);
  }
}

