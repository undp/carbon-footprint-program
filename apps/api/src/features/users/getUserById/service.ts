import type { PrismaClient } from "@repo/database";
import type { GetUserByIdResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";
import { UserNotFoundError } from "../errors.js";

export const getUserByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetUserByIdResponse> => {
  const user = await prismaClient.user.findUnique({
    where: {
      id: BigInt(id),
    },
  });

  if (!user) {
    throw new UserNotFoundError(id);
  }

  return mapUserToResponse(user);
};
