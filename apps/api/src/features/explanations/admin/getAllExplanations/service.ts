import type { PrismaClient } from "@repo/database";
import type { GetAllExplanationsResponse, User } from "@repo/types";

export const getAllExplanationsService = async (
  prismaClient: PrismaClient,
  _query: null,
  _user: User | null
): Promise<GetAllExplanationsResponse> => {
  const explanations = await prismaClient.explanation.findMany({
    orderBy: { name: "asc" },
  });

  return explanations.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    createdById: row.createdById?.toString() ?? null,
    updatedById: row.updatedById?.toString() ?? null,
  }));
};
