import type { PrismaClient } from "@repo/database";
import type { GetAllJobPositionsResponse } from "@repo/types";

export const getAllJobPositionsService = async (
  prismaClient: PrismaClient
): Promise<GetAllJobPositionsResponse> => {
  const data = await prismaClient.country_job_position.findMany({
    orderBy: {
      name: "asc",
    },
  });
  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
  }));
};
