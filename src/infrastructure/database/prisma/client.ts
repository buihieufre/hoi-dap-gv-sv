import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma Client Singleton
 * Sử dụng singleton pattern để tránh tạo nhiều instance trong development
 *
 * Prisma 7 với PostgreSQL:
 * - Cần sử dụng adapter với pg Pool
 * - Connection URL được đọc từ DATABASE_URL environment variable
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create pg Pool
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// In development, check if cached client has new models/fields
// If missing, clear cache and recreate
let prismaInstance: PrismaClient;

// Always check if we need to recreate the client
if (process.env.NODE_ENV !== "production") {
  if (globalForPrisma.prisma) {
    const cachedClient = globalForPrisma.prisma;
    // Check if new models/fields exist
    try {
      // Check for all required models
      const hasQuestionView = "questionView" in cachedClient;
      const hasQuestionWatcher = "questionWatcher" in cachedClient;
      const hasQuestionCategory = "questionCategory" in cachedClient;
      const hasResource = "resource" in cachedClient;
      const needsRefresh =
        !hasQuestionView ||
        !hasQuestionWatcher ||
        !hasQuestionCategory ||
        !hasResource;

      if (needsRefresh) {
        console.warn(
          "⚠️  Prisma client missing new models/fields. Clearing cache and recreating..."
        );
        console.warn(
          `  - questionView: ${hasQuestionView}, questionWatcher: ${hasQuestionWatcher}, questionCategory: ${hasQuestionCategory}, resource: ${hasResource}`
        );
        // Disconnect old client
        (cachedClient as PrismaClient).$disconnect().catch(() => {});
        // Clear cache
        globalForPrisma.prisma = undefined;
      }
    } catch (error) {
      // If checking fails, clear cache to be safe
      console.warn(
        "⚠️  Error checking Prisma client models. Clearing cache and recreating...",
        error
      );
      (cachedClient as PrismaClient).$disconnect().catch(() => {});
      globalForPrisma.prisma = undefined;
    }
  }

  // Create new instance if needed
  prismaInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log: ["query", "error", "warn"],
    });

  // Verify all required models exist after creation
  if (
    !("questionWatcher" in prismaInstance) ||
    !("questionCategory" in prismaInstance) ||
    !("resource" in prismaInstance)
  ) {
    console.error("❌ ERROR: Required models not found in Prisma client!");
    console.error("  Please run: npx prisma generate");
    console.error("  Then restart the dev server");
    // Force clear cache and try one more time
    if (globalForPrisma.prisma) {
      (globalForPrisma.prisma as PrismaClient).$disconnect().catch(() => {});
      globalForPrisma.prisma = undefined;
    }
    // Create fresh instance
    prismaInstance = new PrismaClient({
      adapter,
      log: ["query", "error", "warn"],
    });
  } else {
    console.log("✅ All required models found in Prisma client");
  }
} else {
  // Production: use cached or create new
  prismaInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log: ["error"],
    });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;

export default prisma;
