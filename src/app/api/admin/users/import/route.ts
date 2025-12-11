import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { parseCSVContent, ParsedCSVUser } from "@/shared/utils/csv-parser";
import { generateRandomPassword } from "@/shared/utils/password-generator";
import { emailService } from "@/infrastructure/email/email-service";
import { RegisterUseCase } from "@/usecase/user/register.usecase";
import { UserRepository } from "@/infrastructure/repositories/user.repository.prisma";

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

/**
 * POST /api/admin/users/import
 * Import users from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { message: "Không có file được upload" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { message: "File phải có định dạng CSV" },
        { status: 400 }
      );
    }

    // Parse CSV - Convert File to Buffer/string for server-side parsing
    let users: ParsedCSVUser[];
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      users = parseCSVContent(buffer);
    } catch (parseError) {
      return NextResponse.json(
        {
          message: "Lỗi khi đọc file CSV",
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        },
        { status: 400 }
      );
    }

    if (users.length === 0) {
      return NextResponse.json(
        { message: "File CSV không có dữ liệu" },
        { status: 400 }
      );
    }

    // Process users
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const userRepository = new UserRepository();
    const registerUseCase = new RegisterUseCase(userRepository);

    // Process users sequentially to avoid overwhelming the email service
    for (const userData of users) {
      try {
        // Generate random password
        const password = generateRandomPassword(12);

        // Create user
        const { user } = await registerUseCase.execute({
          email: userData.email,
          password,
          fullName: userData.fullName,
          role: userData.role,
          studentId:
            userData.role === "STUDENT" ? userData.studentId : undefined,
          advisorId:
            userData.role === "ADVISOR" ? userData.studentId : undefined,
        });

        // Send password email
        try {
          await emailService.sendPasswordEmail(
            user.email,
            user.fullName,
            password
          );
        } catch (emailError) {
          console.error(
            `[Import] Failed to send email to ${user.email}:`,
            emailError
          );
          // Don't fail the import if email fails, but log it
          result.errors.push({
            email: user.email,
            error: `Tài khoản đã được tạo nhưng không thể gửi email: ${
              emailError instanceof Error
                ? emailError.message
                : String(emailError)
            }`,
          });
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        const errorMessage =
          error.message || "Lỗi không xác định khi tạo tài khoản";

        // Check if it's a duplicate email error
        if (
          error.code === "P2002" ||
          errorMessage.includes("duplicate") ||
          errorMessage.includes("unique")
        ) {
          result.errors.push({
            email: userData.email,
            error: "Email đã tồn tại trong hệ thống",
          });
        } else {
          result.errors.push({
            email: userData.email,
            error: errorMessage,
          });
        }
      }
    }

    return NextResponse.json({
      message: `Import hoàn tất: ${result.success} thành công, ${result.failed} thất bại`,
      result,
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
