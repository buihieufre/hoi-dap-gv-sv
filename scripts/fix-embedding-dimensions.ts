/**
 * Script to fix embedding dimensions in database
 * Run: tsx scripts/fix-embedding-dimensions.ts
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });

async function main() {
  console.log("🔧 Fixing embedding dimensions...\n");

  try {
    // Check current column type
    const currentType = await pool.query(`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'questions' AND column_name = 'embedding'
    `);

    console.log("📊 Current embedding column type:");
    console.log(JSON.stringify(currentType.rows[0], null, 2));

    // Check if vector extension is enabled
    const extensionCheck = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);

    if (extensionCheck.rows.length === 0) {
      console.log("📦 Enabling pgvector extension...");
      await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
      console.log("✅ Extension enabled");
    }

    // Drop old index
    console.log("\n📋 Dropping old index...");
    await pool.query(`DROP INDEX IF EXISTS "questions_embedding_idx"`);
    console.log("✅ Old index dropped");

    // Alter column to 768 dimensions (Gemini)
    console.log("\n📋 Altering column to 768 dimensions...");
    try {
      await pool.query(`
        ALTER TABLE "questions" 
        ALTER COLUMN "embedding" TYPE vector(768)
      `);
      console.log("✅ Column altered to vector(768)");
    } catch (error: any) {
      if (error.message.includes("cannot be cast")) {
        console.log("⚠️  Column type mismatch. Clearing existing embeddings...");
        await pool.query(`UPDATE questions SET embedding = NULL`);
        await pool.query(`
          ALTER TABLE "questions" 
          ALTER COLUMN "embedding" TYPE vector(768)
        `);
        console.log("✅ Column altered to vector(768) after clearing");
      } else {
        throw error;
      }
    }

    // Recreate HNSW index
    console.log("\n📋 Creating HNSW index...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "questions_embedding_idx" ON "questions" 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    console.log("✅ HNSW index created");

    // Verify
    const verifyType = await pool.query(`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'questions' AND column_name = 'embedding'
    `);

    console.log("\n✅ Verification:");
    console.log(JSON.stringify(verifyType.rows[0], null, 2));

    console.log("\n✅ Embedding dimensions fixed!");
    console.log("\n💡 Now run: tsx scripts/generate-question-embeddings.ts");
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
    await pool.end();
  });

