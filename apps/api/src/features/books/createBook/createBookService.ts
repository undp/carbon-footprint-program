import type { PrismaClient } from "@repo/database";
import type { CreateBookBody, CreateBookResponse } from "./createBookSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle the business logic for creating a new book.
// EXPLANATION:
// This function interacts with the database using Prisma. It receives the
// dependencies it needs (like the Prisma client) and the input data.
// It returns the data in the format expected by the handler.
// Keeping this logic separate from the handler makes it easier to test
// and reuse.
// --------------------------------------------------------------------------------

export const createBookService = async (
  prisma: PrismaClient,
  data: CreateBookBody
): Promise<CreateBookResponse> => {
  const book = await prisma.book.create({
    data: {
      title: data.title,
      author: data.author,
    },
  });

  return book;
};
