import type { PrismaClient } from "@repo/database";
import type { GetMeResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";

export const getMeService = async (
  prismaClient: PrismaClient,
  data: {
    idpUserId?: string;
  }
): Promise<GetMeResponse> => {
  if (!data.idpUserId) {
    // TODO: For now, return null as per requirements
    // In the future, this will create an anonymous user or session
    return null;
  }

  // Try to find user by idpUserId or email
  const user = await prismaClient.user.findFirst({
    where: {
      idpUserId: data.idpUserId,
    },
  });

  if (!user) {
    // TODO: For now, return null as per requirements
    // In the future, this will create an anonymous user or session
    return null;
  }

  const now = new Date();
  const [updatedUser] = await prismaClient.$transaction([
    prismaClient.user.update({
      where: { id: user.id },
      data: { lastAccessAt: now },
    }),
    prismaClient.userAccessLog.create({
      data: { userId: user.id, createdAt: now },
    }),
  ]);

  return mapUserToResponse(updatedUser);
};
