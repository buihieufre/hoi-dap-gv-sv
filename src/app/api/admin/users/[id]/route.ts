import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/infrastructure/repositories/user.repository.prisma";
import { getAuthUser, requireRole } from "@/app/api/middleware/auth";
import { handleHttpError } from "@/shared/utils/http-error";
import { UserRole } from "@/shared/types";
import bcrypt from "bcryptjs";

/**
 * PATCH /api/admin/users/[id]
 * Cập nhật thông tin user (chỉ ADMIN)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ["ADMIN"]);

    const { id } = await params;

    // Validate id
    if (!id) {
      return NextResponse.json(
        { message: "ID người dùng không hợp lệ" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, fullName, role, studentId, advisorId, password } = body;

    const userRepository = new UserRepository();
    const existingUser = await userRepository.findById(id);

    if (!existingUser) {
      return NextResponse.json(
        { message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (role && ["STUDENT", "ADVISOR", "ADMIN"].includes(role)) {
      updateData.role = role as UserRole;
    }
    if (studentId !== undefined) {
      updateData.studentId = role === "STUDENT" ? studentId : null;
    }
    if (advisorId !== undefined) {
      updateData.advisorId = role === "ADVISOR" ? advisorId : null;
    }
    // Xử lý cập nhật mật khẩu
    if (password !== undefined && password !== null) {
      // Kiểm tra nếu password là chuỗi rỗng
      if (typeof password === "string" && password.trim() === "") {
        return NextResponse.json(
          { message: "Mật khẩu không được để trống" },
          { status: 400 }
        );
      }
      // Kiểm tra độ dài mật khẩu
      if (password.length < 6) {
        return NextResponse.json(
          { message: "Mật khẩu phải có ít nhất 6 ký tự" },
          { status: 400 }
        );
      }
      // Hash mật khẩu trước khi lưu
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await userRepository.update(id, updateData);

    return NextResponse.json({
      message: "Cập nhật thành công",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        studentId: updatedUser.studentId,
        advisorId: updatedUser.advisorId,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    return handleHttpError(error);
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Xóa user (chỉ ADMIN)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    requireRole(request, ["ADMIN"]); // Check permission

    const { id } = await params;

    // Validate id
    if (!id) {
      return NextResponse.json(
        { message: "ID người dùng không hợp lệ" },
        { status: 400 }
      );
    }

    const userRepository = new UserRepository();
    const user = await userRepository.findById(id);

    if (!user) {
      return NextResponse.json(
        { message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    // Không cho phép xóa chính mình
    if (authUser.userId === id) {
      return NextResponse.json(
        { message: "Không thể xóa chính tài khoản của bạn" },
        { status: 400 }
      );
    }

    await userRepository.delete(id);

    return NextResponse.json({
      message: "Xóa người dùng thành công",
    });
  } catch (error) {
    return handleHttpError(error);
  }
}
