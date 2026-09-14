-- Install pgvector extension first so the vector(1024) type is recognized.
CREATE EXTENSION IF NOT EXISTS vector;

-- Add nullable embedding column to chatbot_corpus_chunk.
ALTER TABLE "chatbot_corpus_chunk" ADD COLUMN "embedding" vector(1024);

-- HNSW index using cosine distance with pgvector defaults (m=16, ef_construction=64).
-- Search-time ef_search is intentionally not pinned (default 40).
CREATE INDEX "chatbot_corpus_chunk_embedding_hnsw_idx"
  ON "chatbot_corpus_chunk"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
