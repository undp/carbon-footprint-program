-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "submission_file_type" AS ENUM ('SUBMIT_ATTACHMENT', 'RECOGNITION', 'REVIEW_ATTACHMENT');

-- CreateTable
CREATE TABLE "file" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "blob_path" TEXT NOT NULL,
    "status" "file_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    --TODO: This should be not null once we don't have to backfill badges with null createdById
    "created_by_id" BIGINT,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_uuid_key" ON "file"("uuid");

-- CreateTable
CREATE TABLE "submission_file" (
    "file_id" BIGINT NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "type" "submission_file_type" NOT NULL DEFAULT 'SUBMIT_ATTACHMENT',

    CONSTRAINT "submission_file_pkey" PRIMARY KEY ("file_id","submission_id")
);

-- CreateIndex
CREATE INDEX "submission_file_submission_id_idx" ON "submission_file"("submission_id");

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_file" ADD CONSTRAINT "submission_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_file" ADD CONSTRAINT "submission_file_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
