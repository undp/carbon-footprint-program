import type { PrismaClient } from "@repo/database";
import { EmissionFactorStatus, User } from "@repo/types";
import {
  EmissionFactorInUseError,
  EmissionFactorNotFoundError,
} from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import {
  countActiveLineReferences,
  detachFactorFromUnclaimedLines,
} from "../helpers.js";

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

    // A factor a footprint depends on cannot be removed either. The delete is a
    // soft one, so the row would survive for the snapshots that point at it,
    // but it would disappear from the catalogue while lines still report it.
    const referencedLineCount = await countActiveLineReferences(
      tx,
      emissionFactorId
    );
    if (referencedLineCount > 0) {
      throw new EmissionFactorInUseError(referencedLineCount.toString());
    }

    // Only unclaimed footprints can still be pointing at it here, and their
    // lines are detached rather than left holding a snapshot of a factor the
    // selector no longer offers. Same transaction as the delete: a line must
    // never be readable against a factor that is already gone.
    await detachFactorFromUnclaimedLines(tx, emissionFactorId);

    await tx.emissionFactor.update({
      where: { id: emissionFactorId },
      data: {
        status: EmissionFactorStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });
  });
};
