import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/infrastructure/repositories/user.repository.prisma";
import { RegisterUseCase } from "@/usecase/user/register.usecase";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import bcrypt from "bcryptjs";

/**
 * GET /api/admin/users
 * Lấy danh sách tất cả users (chỉ ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);

    const userRepository = new UserRepository();
    const users = await userRepository.findAll();

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentId: user.studentId,
        advisorId: user.advisorId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * POST /api/admin/users
 * Tạo user mới (chỉ ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);

    const body = await request.json();
    const { email, password, fullName, role, studentId, advisorId } = body;

    // Validation
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { message: "Email, password, fullName và role là bắt buộc" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Mật khẩu phải có ít nhất 6 ký tự" },
        { status: 400 }
      );
    }

    const userRepository = new UserRepository();
    const registerUseCase = new RegisterUseCase(userRepository);

    const { user } = await registerUseCase.execute({
      email,
      password,
      fullName,
      role,
      studentId: role === "STUDENT" ? studentId : undefined,
      advisorId: role === "ADVISOR" ? advisorId : undefined,
    });

    return NextResponse.json(
      {
        message: "Tạo tài khoản thành công",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          studentId: user.studentId,
          advisorId: user.advisorId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleHttpError(error);
  }
}

