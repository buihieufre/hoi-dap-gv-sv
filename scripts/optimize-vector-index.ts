/**
 * Script to optimize vector index from IVFFlat to HNSW
 * Run: tsx scripts/optimize-vector-index.ts
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
  console.log("🚀 Starting vector index optimization...");

  try {
    // Drop old IVFFlat index if exists
    console.log("📋 Dropping old IVFFlat index...");
    await pool.query(`DROP INDEX IF EXISTS "questions_embedding_idx"`);
    console.log("✅ Old index dropped");

    // Create new HNSW index
    console.log("📋 Creating new HNSW index...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "questions_embedding_idx" ON "questions" 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    console.log("✅ HNSW index created successfully");

    // Get index info
    const indexInfo = await pool.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'questions' AND indexname = 'questions_embedding_idx'
    `);

    console.log("\n📊 Index Information:");
    console.log(JSON.stringify(indexInfo.rows[0], null, 2));

    console.log("\n✅ Vector index optimization completed!");
    console.log("\n💡 Note: HNSW index provides:");
    console.log("   - Faster approximate nearest neighbor search");
    console.log("   - Better accuracy than IVFFlat");
    console.log("   - Suitable for production workloads");
  } catch (error) {
    console.error("❌ Error optimizing index:", error);
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

