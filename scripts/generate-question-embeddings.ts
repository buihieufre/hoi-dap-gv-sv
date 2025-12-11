/**
 * Script to generate embeddings for existing questions
 * Run: tsx scripts/generate-question-embeddings.ts
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  generateEmbedding,
  formatEmbeddingForPostgres,
} from "../src/shared/utils/embeddings";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting to generate embeddings for questions...");

  // Get all questions (including those with wrong dimensions - we'll regenerate all)
  // First, check if we need to clear existing embeddings with wrong dimensions
  console.log("🔍 Checking for questions with wrong embedding dimensions...");

  const questions = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      content: string;
    }>
  >`
    SELECT id, title, content
    FROM questions
    WHERE embedding IS NULL 
       OR array_length((embedding::text::float[]), 1) != 768
    ORDER BY "createdAt" DESC
  `;

  console.log(`📊 Found ${questions.length} questions without embeddings`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    try {
      console.log(
        `[${i + 1}/${questions.length}] Processing: ${question.title.substring(
          0,
          50
        )}...`
      );

      const embeddingText = `${question.title} ${question.content}`;
      const embedding = await generateEmbedding(embeddingText);

      // Verify dimensions
      const expectedDimensions = 768; // Gemini default
      if (embedding.length !== expectedDimensions) {
        throw new Error(
          `Embedding dimensions mismatch: got ${embedding.length}, expected ${expectedDimensions}`
        );
      }

      const embeddingString = formatEmbeddingForPostgres(embedding);

      // Use executeRawUnsafe for better compatibility with vector type
      await prisma.$executeRawUnsafe(
        `UPDATE questions SET embedding = $1::vector(768) WHERE id = $2`,
        embeddingString,
        question.id
      );

      success++;
      console.log(`  ✅ Success`);

      // Rate limiting: wait 100ms between requests to avoid hitting API limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      failed++;
      console.error(
        `  ❌ Failed:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log("\n📈 Summary:");
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total: ${questions.length}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
