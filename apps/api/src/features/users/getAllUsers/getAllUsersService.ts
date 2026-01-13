import type { PrismaClient } from "@repo/database";
import type { GetAllUsersResponse } from "@repo/types";

export const getAllUsersService = async (
  prismaClient: PrismaClient
): Promise<GetAllUsersResponse> => {
  const users = await prismaClient.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map((user) => ({
    id: user.id.toString(),
    uuid: user.uuid,
    email: user.email,
    countryJobPositionId: user.countryJobPositionId.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    createdById: user.createdById?.toString() ?? null,
    updatedById: user.updatedById?.toString() ?? null,
  }));
};
