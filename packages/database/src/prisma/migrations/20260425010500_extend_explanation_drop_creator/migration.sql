-- DropForeignKey
ALTER TABLE "explanation" DROP CONSTRAINT "explanation_created_by_id_fkey";

-- AlterTable
ALTER TABLE "explanation" DROP COLUMN "created_by_id",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL;
