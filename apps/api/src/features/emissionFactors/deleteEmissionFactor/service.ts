import type { PrismaClient } from "@repo/database";
import { EmissionFactorStatus, User } from "@repo/types";
import { EmissionFactorNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";

export const deleteEmissionFactorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const emissionFactorId = BigInt(id);

  await prismaClient.$transaction(async (tx) => {
    const emissionFactor = await tx.emissionFactor.findFirst({
      where: {
        id: emissionFactorId,
        status: EmissionFactorStatus.ACTIVE,
      },
      select: { status: true },
    });

    if (!emissionFactor) {
      throw new EmissionFactorNotFoundError(id);
    }

    await tx.emissionFactor.update({
      where: { id: emissionFactorId },
      data: {
        status: EmissionFactorStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });
  });
};
