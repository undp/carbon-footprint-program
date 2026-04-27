import type { PrismaClient } from "@repo/database";
import type { GetAllExplanationsResponse, User } from "@repo/types";

export const getAllExplanationsService = (
  prismaClient: PrismaClient,
  _query: null,
  _user: User | null
): Promise<GetAllExplanationsResponse> =>
  prismaClient.explanation.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      content: true,
    },
  });
