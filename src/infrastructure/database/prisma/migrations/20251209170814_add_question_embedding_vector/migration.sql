-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN "embedding" vector(1536);

-- Create index for vector similarity search (using cosine distance)
CREATE INDEX IF NOT EXISTS "questions_embedding_idx" ON "questions" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
