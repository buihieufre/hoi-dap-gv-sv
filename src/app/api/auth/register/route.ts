/**
 * Register API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { RegisterUseCase } from "@/usecase/user/register.usecase";
import { UserRepository } from "@/infrastructure/repositories/user.repository.prisma";
import { generateToken } from "@/infrastructure/config/auth";
import { mapErrorToHttpResponse } from "@/shared/utils/http-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, role, studentId, advisorId } = body;

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Email, password, fullName, and role are required" },
        { status: 400 }
      );
    }

    // Initialize use case
    const userRepository = new UserRepository();
    const registerUseCase = new RegisterUseCase(userRepository);

    // Execute register
    const result = await registerUseCase.execute({
      email,
      password,
      fullName,
      role,
      studentId,
      advisorId,
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    // Create response
    const response = NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          studentId: result.user.studentId,
          advisorId: result.user.advisorId,
        },
        token,
      },
      { status: 201 }
    );

    // Set HTTP-only cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    return mapErrorToHttpResponse(error, error.statusCode || 500);
  }
}

