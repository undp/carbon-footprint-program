-- CreateEnum
CREATE TYPE "chatbot_chat_message_role" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "chatbot_corpus_source_type" AS ENUM ('PDF', 'MD', 'URL', 'XLSX');

-- CreateEnum
CREATE TYPE "chatbot_corpus_source_scope" AS ENUM ('GLOBAL', 'NATIONAL');

-- CreateEnum
CREATE TYPE "chatbot_corpus_source_status" AS ENUM ('DRAFT', 'ACTIVE', 'OUTDATED');

-- CreateTable
CREATE TABLE "chatbot_chat_conversation" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "session_id" TEXT,
    "organization_id" BIGINT,
    "ip_hash" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "chatbot_chat_conversation_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint
-- The relaxed CHECK tolerates the (NULL, NULL) post-deletion state produced by
-- ON DELETE SET NULL on the user_id FK. Application code is responsible for
-- the exactly-one-of invariant on INSERT.
ALTER TABLE "chatbot_chat_conversation"
  ADD CONSTRAINT "chatbot_chat_conversation_identity_check"
  CHECK (
    (user_id IS NOT NULL AND session_id IS NULL)
    OR (user_id IS NULL AND session_id IS NOT NULL)
    OR (user_id IS NULL AND session_id IS NULL)
  );

-- CreateTable
CREATE TABLE "chatbot_chat_message" (
    "id" BIGSERIAL NOT NULL,
    "conversation_id" BIGINT NOT NULL,
    "role" "chatbot_chat_message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "latency_ms" INTEGER,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "sources_cited" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatbot_chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_corpus_source" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source_type" "chatbot_corpus_source_type" NOT NULL,
    "scope" "chatbot_corpus_source_scope" NOT NULL,
    "blob_path" TEXT,
    "cite_url" TEXT,
    "cite_label" TEXT,
    "status" "chatbot_corpus_source_status" NOT NULL,
    "embedding_model" TEXT,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),

    CONSTRAINT "chatbot_corpus_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_corpus_chunk" (
    "id" BIGSERIAL NOT NULL,
    "source_id" BIGINT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "page_number" INTEGER,
    "section_title" TEXT,
    "tokens" INTEGER,

    CONSTRAINT "chatbot_corpus_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_corpus_ingest_run" (
    "id" BIGSERIAL NOT NULL,
    "source_id" BIGINT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "chunks_created" INTEGER,
    "embedding_model" TEXT,
    "triggered_by" TEXT,

    CONSTRAINT "chatbot_corpus_ingest_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chatbot_chat_conversation_session_id_created_at_idx" ON "chatbot_chat_conversation" ("session_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chatbot_chat_conversation_user_id_expires_at_idx" ON "chatbot_chat_conversation" ("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "chatbot_chat_conversation_expires_at_idx" ON "chatbot_chat_conversation" ("expires_at");

-- CreateIndex
CREATE INDEX "chatbot_chat_conversation_ip_hash_created_at_idx" ON "chatbot_chat_conversation" ("ip_hash", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chatbot_chat_message_conversation_id_created_at_idx" ON "chatbot_chat_message" ("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "chatbot_chat_conversation" ADD CONSTRAINT "chatbot_chat_conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_chat_conversation" ADD CONSTRAINT "chatbot_chat_conversation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_chat_message" ADD CONSTRAINT "chatbot_chat_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chatbot_chat_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_corpus_chunk" ADD CONSTRAINT "chatbot_corpus_chunk_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "chatbot_corpus_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_corpus_ingest_run" ADD CONSTRAINT "chatbot_corpus_ingest_run_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "chatbot_corpus_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
