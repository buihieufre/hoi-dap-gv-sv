/**
 * Script to check how many questions have embeddings
 * Run: tsx scripts/check-embeddings.ts
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
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
  console.log("🔍 Checking embeddings status...\n");

  try {
    // Get total questions
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Total questions: ${totalQuestions}`);

    // Get questions with embeddings
    const questionsWithEmbeddings = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*) as count
      FROM questions
      WHERE embedding IS NOT NULL
    `;
    const withEmbeddings = Number(questionsWithEmbeddings[0].count);
    console.log(`✅ Questions with embeddings: ${withEmbeddings}`);
    console.log(
      `❌ Questions without embeddings: ${totalQuestions - withEmbeddings}`
    );

    // Get sample questions without embeddings (using raw query since embedding is Unsupported type)
    const sampleWithoutEmbeddingsRaw = await prisma.$queryRaw<
      Array<{ id: string; title: string; createdAt: Date }>
    >`
      SELECT id, title, "createdAt"
      FROM questions
      WHERE embedding IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 5
    `;
    const sampleWithoutEmbeddings = sampleWithoutEmbeddingsRaw.map((q) => ({
      id: q.id,
      title: q.title,
      createdAt: q.createdAt,
    }));

    if (sampleWithoutEmbeddings.length > 0) {
      console.log("\n📝 Sample questions without embeddings:");
      sampleWithoutEmbeddings.forEach((q, i) => {
        console.log(`  ${i + 1}. ${q.title.substring(0, 60)}... (${q.id})`);
      });
    }

    // Check embedding dimensions
    const dimensionCheck = await pool.query(`
      SELECT 
        pg_typeof(embedding) as type,
        array_length((embedding::text::float[]), 1) as dimensions
      FROM questions
      WHERE embedding IS NOT NULL
      LIMIT 1
    `);

    if (dimensionCheck.rows.length > 0) {
      console.log(
        `\n📐 Embedding dimensions: ${
          dimensionCheck.rows[0].dimensions || "unknown"
        }`
      );
    }

    console.log("\n💡 To generate embeddings for all questions:");
    console.log("   tsx scripts/generate-question-embeddings.ts");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
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
