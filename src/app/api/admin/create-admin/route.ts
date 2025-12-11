/**
 * Create Admin Account API Route
 * This is a one-time setup route to create the first admin account
 */

import { NextRequest, NextResponse } from "next/server";
import { RegisterUseCase } from "@/usecase/user/register.usecase";
import { UserRepository } from "@/infrastructure/repositories/user.repository.prisma";
import { mapErrorToHttpResponse } from "@/shared/utils/http-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and fullName are required" },
        { status: 400 }
      );
    }

    // Initialize use case
    const userRepository = new UserRepository();
    const registerUseCase = new RegisterUseCase(userRepository);

    // Create admin account
    const result = await registerUseCase.execute({
      email,
      password,
      fullName,
      role: "ADMIN",
    });

    return NextResponse.json(
      {
        message: "Admin account created successfully",
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return mapErrorToHttpResponse(error, error.statusCode || 500);
  }
}

