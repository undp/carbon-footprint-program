/*
  Warnings:

  - You are about to drop the `bookHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookHistory" DROP CONSTRAINT "bookHistory_bookId_fkey";

-- DropTable
DROP TABLE "bookHistory";
