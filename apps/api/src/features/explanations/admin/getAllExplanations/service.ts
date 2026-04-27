import type { PrismaClient } from "@repo/database";
import type { GetAllExplanationsResponse, User } from "@repo/types";
import { mapExplanationToResponse } from "../../mappers.js";

export const getAllExplanationsService = async (
  prismaClient: PrismaClient,
  _query: null,
  _user: User | null
): Promise<GetAllExplanationsResponse> => {
  const explanations = await prismaClient.explanation.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      content: true,
    },
  });

  return explanations.map(mapExplanationToResponse);
};
