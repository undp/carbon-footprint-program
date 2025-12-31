/*
  Warnings:

  - Added the required column `position` to the `category` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "category" ADD COLUMN     "position" INTEGER NOT NULL;
