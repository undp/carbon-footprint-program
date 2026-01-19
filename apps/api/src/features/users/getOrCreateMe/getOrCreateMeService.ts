import type { PrismaClient } from "@repo/database";
import type { GetOrCreateMeBody, GetOrCreateMeResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";

/**
 * TODO: Creation of anonymous users is not yet implemented.
 * Currently, this function only performs a lookup and returns null when no user exists.
 * In the future, this should create an anonymous user or session when a user is not found.
 */
export const getOrCreateMeService = async (
  prismaClient: PrismaClient,
  data: GetOrCreateMeBody
): Promise<GetOrCreateMeResponse> => {
  // Try to find user by idpUserId or email
  const user = await prismaClient.user.findFirst({
    where: {
      OR: [
        { idpUserId: data.idpUserId },
        { email: data.email },
      ],
    },
    include: {
      countryJobPosition: true,
    },
  });

  if (!user) {
    // For now, return null as per requirements
    // In the future, this will create an anonymous user or session
    return null;
  }

  return mapUserToResponse(user);
};
