/**
 * HTTP Error Helper
 */

import { NextResponse } from "next/server";
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/usecase/errors/app-error";

export function mapErrorToHttpResponse(
  error: Error,
  status: number = 500
): NextResponse {
  const statusCode = error instanceof AppError ? error.statusCode : status;
  const code = (error as any).code || "INTERNAL_ERROR";

  return NextResponse.json(
    {
      error: error.message,
      code,
    },
    { status: statusCode }
  );
}

/**
 * Handle HTTP errors from AppError instances
 * Automatically maps error types to appropriate HTTP responses
 */
export function handleHttpError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: error.statusCode }
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { message: error.message || "Forbidden" },
      { status: error.statusCode }
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { message: error.message || "Not Found" },
      { status: error.statusCode }
    );
  }
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { message: error.message || "Validation Error" },
      { status: error.statusCode }
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json(
      { message: error.message || "An application error occurred" },
      { status: error.statusCode }
    );
  }
  // Generic error
  if (error instanceof Error) {
    console.error("Unhandled error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
  // Unknown error type
  console.error("Unknown error type:", error);
  return NextResponse.json(
    { message: "Internal Server Error" },
    { status: 500 }
  );
}
