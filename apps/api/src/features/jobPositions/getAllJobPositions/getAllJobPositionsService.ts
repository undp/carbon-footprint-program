import type { PrismaClient } from "@repo/database";
import type { GetAllJobPositionsResponse } from "./getAllJobPositionsSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle the business logic for retrieving a book by its ID.
// EXPLANATION:
// This function interacts with the database using Prisma. It receives the
// dependencies it needs (like the Prisma client) and the input data.
// It returns the data in the format expected by the handler.
// Keeping this logic separate from the handler makes it easier to test
// and reuse.
// --------------------------------------------------------------------------------

export const getAllJobPositionsService = async (
  prismaClient: PrismaClient
): Promise<GetAllJobPositionsResponse> => {
  const data = await prismaClient.country_job_position.findMany();
  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
  }));
};
