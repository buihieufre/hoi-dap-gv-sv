-- Update embedding column to support Gemini (768 dimensions) instead of OpenAI (1536)
-- Note: If you want to keep OpenAI compatibility, you'll need to regenerate all embeddings
-- or use a larger dimension size that accommodates both

-- Drop old index
DROP INDEX IF EXISTS "questions_embedding_idx";

-- Alter column to new dimension (this will require regenerating embeddings)
-- For Gemini text-embedding-004: 768 dimensions
-- For OpenAI text-embedding-ada-002: 1536 dimensions
-- Choose based on your provider preference
ALTER TABLE "questions" ALTER COLUMN "embedding" TYPE vector(768);

-- Recreate HNSW index with new dimensions
CREATE INDEX IF NOT EXISTS "questions_embedding_idx" ON "questions" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Note: After this migration, you'll need to regenerate embeddings for all questions
-- Run: tsx scripts/generate-question-embeddings.ts

