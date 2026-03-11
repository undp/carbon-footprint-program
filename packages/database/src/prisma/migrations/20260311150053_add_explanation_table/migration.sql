-- AlterTable
ALTER TABLE "category" ADD COLUMN     "explanation_id" BIGINT;

-- AlterTable
ALTER TABLE "subcategory" ADD COLUMN     "explanation_id" BIGINT;

-- CreateTable
CREATE TABLE "explanation" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "explanation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_explanation_id_fkey" FOREIGN KEY ("explanation_id") REFERENCES "explanation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_explanation_id_fkey" FOREIGN KEY ("explanation_id") REFERENCES "explanation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanation" ADD CONSTRAINT "explanation_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanation" ADD CONSTRAINT "explanation_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
