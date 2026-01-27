import type { PrismaClient } from "@repo/database";
import type { GetMeBody, GetMeResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";

export const getMeService = async (
  prismaClient: PrismaClient,
  data: GetMeBody
): Promise<GetMeResponse> => {
  // Try to find user by idpUserId or email
  const user = await prismaClient.user.findFirst({
    where: {
      idpUserId: data.idpUserId,
    },
  });

  if (!user) {
    // For now, return null as per requirements
    // In the future, this will create an anonymous user or session
    return null;
  }

  return mapUserToResponse(user);
};
