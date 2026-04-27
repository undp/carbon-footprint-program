import type { PrismaClient } from "@repo/database";
import type { GetAllUsersResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";

export const getAllUsersService = async (
  prismaClient: PrismaClient
): Promise<GetAllUsersResponse> => {
  const users = await prismaClient.user.findMany({
    include: {
      countryJobPosition: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map((user) => ({
    ...mapUserToResponse(user),
    jobPositionName: user.countryJobPosition?.name ?? null,
  }));
};
