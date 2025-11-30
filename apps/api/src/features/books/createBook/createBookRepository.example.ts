import type { PrismaClient } from "@repo/database";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle complex database operations for creating a book.
// EXPLANATION:
// This repository encapsulates complex database operations, particularly those
// that require transactions. It handles the creation of a book along with
// related records (like history) in a single atomic operation.
// --------------------------------------------------------------------------------

export interface CreateBookData {
  title: string;
  author: string;
}

export interface CreateBookWithHistoryResult {
  id: number;
  title: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createBookRepository = {
  /**
   * Creates a book and its initial history record in a single transaction.
   * This ensures data consistency - if either operation fails, both are rolled back.
   */
  async createWithHistory(
    prisma: PrismaClient,
    data: CreateBookData
  ): Promise<CreateBookWithHistoryResult> {
    return prisma.$transaction(async (tx) => {
      // Create the book
      const book = await tx.book.create({
        data: {
          title: data.title,
          author: data.author,
        },
      });

      // Create the initial history record
      await tx.bookHistory.create({
        data: {
          bookId: book.id,
          action: "created",
        },
      });

      return book;
    });
  },
};
