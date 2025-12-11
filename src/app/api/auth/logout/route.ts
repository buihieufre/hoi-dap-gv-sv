/**
 * Logout API Route
 */

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });
  // Disable cache for this response
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  // Clear auth token cookie
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

