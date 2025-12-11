-- Optimize vector index: Replace IVFFlat with HNSW for faster approximate nearest neighbor search
-- HNSW is generally faster and more accurate than IVFFlat for similarity search

-- Drop old index
DROP INDEX IF EXISTS "questions_embedding_idx";

-- Create HNSW index (faster than IVFFlat for ANN search)
-- m: number of connections per layer (default: 16, higher = more accurate but slower build)
-- ef_construction: size of candidate list during construction (default: 64, higher = more accurate but slower build)
CREATE INDEX IF NOT EXISTS "questions_embedding_idx" ON "questions" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Note: For production with large datasets, you may want to increase m and ef_construction
-- Example for very large datasets:
-- CREATE INDEX ... WITH (m = 32, ef_construction = 128);

