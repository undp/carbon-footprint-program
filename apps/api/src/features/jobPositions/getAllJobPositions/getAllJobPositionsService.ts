import type { PrismaClient } from "@repo/database";
import type { GetAllJobPositionsResponse } from "./getAllJobPositionsSchema.js";

export const getAllJobPositionsService = async (
  prismaClient: PrismaClient
): Promise<GetAllJobPositionsResponse> => {
  const data = await prismaClient.country_job_position.findMany();
  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
  }));
};
