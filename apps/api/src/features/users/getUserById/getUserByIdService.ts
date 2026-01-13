import type { PrismaClient } from "@repo/database";
import type { GetUserByIdResponse } from "@repo/types";

export const getUserByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetUserByIdResponse | null> => {
  const user = await prismaClient.user.findUnique({
    where: {
      id: BigInt(id),
    },
    include: {
      countryJobPosition: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
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
  };
};
