-- AlterTable
ALTER TABLE "category" ADD COLUMN "explanation" TEXT;

-- AlterTable
ALTER TABLE "subcategory" ADD COLUMN "explanation" TEXT;

-- CreateTable
CREATE TABLE "explanation" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "explanation_pkey" PRIMARY KEY ("slug")
);

-- AddForeignKey
ALTER TABLE "explanation" ADD CONSTRAINT "explanation_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanation" ADD CONSTRAINT "explanation_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
