-- AlterTable
ALTER TABLE "category" ADD COLUMN     "explanation_slug" TEXT;

-- AlterTable
ALTER TABLE "subcategory" ADD COLUMN     "explanation_slug" TEXT;

-- CreateTable
CREATE TABLE "explanation" (
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "explanation_pkey" PRIMARY KEY ("slug")
);

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_explanation_slug_fkey" FOREIGN KEY ("explanation_slug") REFERENCES "explanation"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_explanation_slug_fkey" FOREIGN KEY ("explanation_slug") REFERENCES "explanation"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanation" ADD CONSTRAINT "explanation_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanation" ADD CONSTRAINT "explanation_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
