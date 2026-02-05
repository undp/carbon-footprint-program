import type { PrismaClient } from "@repo/database";
import type { GetAllJobPositionsResponse } from "@repo/types";

export const getAllJobPositionsService = async (
  prismaClient: PrismaClient
): Promise<GetAllJobPositionsResponse> => {
  const jobPositions = await prismaClient.countryJobPosition.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return jobPositions.map((pos) => ({
    ...pos,
    id: pos.id.toString(),
  }));
};
