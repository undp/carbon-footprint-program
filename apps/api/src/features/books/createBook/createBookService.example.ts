import type { PrismaClient } from "@repo/database";
import type {
  CreateBookBody,
  CreateBookResponse,
} from "./createBookSchema.example.js";
import { CreateBookUseCase } from "./createBookUseCase.example.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle the business logic for creating a new book.
// EXPLANATION:
// This function acts as the public interface for the create book feature.
// It delegates the complex business logic to the UseCase, maintaining
// a simple and consistent API for the handler.
// Keeping this logic separate from the handler makes it easier to test
// and reuse.
// --------------------------------------------------------------------------------

export const createBookService = async (
  prisma: PrismaClient,
  data: CreateBookBody
): Promise<CreateBookResponse> => {
  const useCase = new CreateBookUseCase(prisma);
  return useCase.execute(data);
};
