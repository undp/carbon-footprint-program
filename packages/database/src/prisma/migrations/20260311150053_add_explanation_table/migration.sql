-- AlterTable
ALTER TABLE "category" DROP COLUMN "examples",
ADD COLUMN "explanation" TEXT;

-- AlterTable
ALTER TABLE "subcategory" DROP COLUMN "examples",
ADD COLUMN "explanation" TEXT;

-- CreateTable
CREATE TABLE "explanation" (
    "slug" TEXT NOT NULL,
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
