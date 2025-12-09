import type { PrismaClient } from "@prisma/client";
import type { GetBookByIdResponse } from "./getBookByIdSchema.example.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle the business logic for retrieving a book by its ID.
// EXPLANATION:
// This function interacts with the database using Prisma. It receives the
// dependencies it needs (like the Prisma client) and the input data.
// It returns the data in the format expected by the handler.
// Keeping this logic separate from the handler makes it easier to test
// and reuse.
// --------------------------------------------------------------------------------

export const getBookByIdService = async (
  prismaClient: PrismaClient,
  id: number
): Promise<GetBookByIdResponse | null> => {
  const book = await prismaClient.book.findUnique({
    where: { id },
  });

  return book;
};
