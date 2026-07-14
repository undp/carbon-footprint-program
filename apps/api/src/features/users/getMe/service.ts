import type { PrismaClient } from "@repo/database";
import type { GetMeResponse } from "@repo/types";
import { mapOnboardingsCompleted, mapUserToResponse } from "../mappers.js";

export const getMeService = async (
  prismaClient: PrismaClient,
  data: {
    idpUserId?: string;
  }
): Promise<GetMeResponse> => {
  if (!data.idpUserId) {
    return null;
  }

  const user = await prismaClient.user.findFirst({
    where: {
      idpUserId: data.idpUserId,
    },
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  const [updatedUser] = await prismaClient.$transaction([
    prismaClient.user.update({
      where: { id: user.id },
      data: { lastAccessAt: now },
      include: { onboardingCompletions: { select: { onboardingKey: true } } },
    }),
    prismaClient.userAccessLog.create({
      data: { userId: user.id, createdAt: now },
    }),
  ]);

  return {
    ...mapUserToResponse(updatedUser),
    onboardingsCompleted: mapOnboardingsCompleted(
      updatedUser.onboardingCompletions
    ),
  };
};
