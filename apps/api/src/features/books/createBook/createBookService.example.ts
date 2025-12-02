import type { PrismaClient } from "@repo/database";
import type {
  CreateBookBody,
  CreateBookResponse,
} from "./createBookSchema.example.js";

// --------------------------------------------------------------------------------
// Implementación simplificada del servicio:
// - Sin use case ni repository separados.
// - Aplica la lógica mínima necesaria directamente aquí.
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

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
};
