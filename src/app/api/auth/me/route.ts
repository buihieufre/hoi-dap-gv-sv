/**
 * Get Current User API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyToken } from "@/infrastructure/config/auth";
import { UserRepository } from "@/infrastructure/repositories/user.repository.prisma";

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const cookies = request.headers.get("cookie") || "";
    const token = getTokenFromCookies(cookies);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    let payload = null;
    try {
      payload = verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get user
    const userRepository = new UserRepository();
    const user = await userRepository.findById(payload.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentId: user.studentId,
        advisorId: user.advisorId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
