import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { uploadImageToCloudinary } from "@/shared/utils/cloudinary";

/**
 * POST /api/upload
 * Upload image file to Cloudinary for Editor.js
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    getAuthUser(request);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: 0, message: "Không có file được upload" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: 0, message: "Chỉ chấp nhận file ảnh" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: 0, message: "File quá lớn. Kích thước tối đa là 5MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const cloudinaryUrl = await uploadImageToCloudinary(buffer, "questions");

    // Return Editor.js format with Cloudinary URL
    return NextResponse.json({
      success: 1,
      file: {
        url: cloudinaryUrl,
      },
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return handleHttpError(error);
  }
}
