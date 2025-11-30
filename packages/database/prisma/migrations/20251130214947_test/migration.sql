-- CreateTable
CREATE TABLE "bookHistory" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookHistory_bookId_idx" ON "bookHistory"("bookId");

-- AddForeignKey
ALTER TABLE "bookHistory" ADD CONSTRAINT "bookHistory_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
