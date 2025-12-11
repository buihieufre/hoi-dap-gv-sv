/**
 * Login API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { LoginUseCase } from "@/usecase/user/login.usecase";
import { UserRepository } from "@/infrastructure/repositories/user.repository.prisma";
import { generateToken } from "@/infrastructure/config/auth";
import { mapErrorToHttpResponse } from "@/shared/utils/http-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      const errorResponse = NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
      // Disable cache for this error response
      errorResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return errorResponse;
    }

    // Initialize use case
    const userRepository = new UserRepository();
    const loginUseCase = new LoginUseCase(userRepository);

    // Execute login
    const result = await loginUseCase.execute({ email, password });

    // Generate JWT token (infrastructure concern)
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
      { status: 200 }
    );

    // Disable cache for this successful response
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

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
    const errResponse = mapErrorToHttpResponse(error, error.statusCode || 500);
    if (errResponse && errResponse.headers) {
      errResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    }
    return errResponse;
  }
}

