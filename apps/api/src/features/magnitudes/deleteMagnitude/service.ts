import { type PrismaClient, Prisma, MagnitudeStatus } from "@repo/database";
import type { User } from "@repo/types";
import { MagnitudeNotFoundError, MagnitudeReferencedError } from "../errors.js";
import {
  assertMagnitudeNotSystem,
  getMagnitudeReferenceCount,
} from "../helpers.js";

export const deleteMagnitudeService = async (
  prismaClient: PrismaClient,
  id: string,
  _user: User | null
): Promise<void> => {
  await prismaClient.$transaction(
    async (tx) => {
      const target = await tx.magnitude.findUnique({
        where: { id: BigInt(id) },
      });

      if (!target || target.status === MagnitudeStatus.DELETED) {
        throw new MagnitudeNotFoundError(id);
      }

      assertMagnitudeNotSystem(target);

      const referenceCount = await getMagnitudeReferenceCount(tx, target.id);
      if (referenceCount > 0) {
        throw new MagnitudeReferencedError();
      }

      await tx.magnitude.update({
        where: { id: target.id },
        data: { status: MagnitudeStatus.DELETED },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
};
