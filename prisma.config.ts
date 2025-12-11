/**
 * Prisma Config for Migrations
 * Prisma 7: This file must be at the root of the project
 */

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/infrastructure/database/prisma/schema.prisma",
  migrations: {
    path: "src/infrastructure/database/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
