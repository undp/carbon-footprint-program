import { CarbonInventoryLineStatus, type PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/types";
import {
  MethodologyHasActiveInventoriesError,
  MethodologyIsPublishedError,
  MethodologyNotFoundError,
} from "../errors.js";

export const deleteMethodologyService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<void> => {
  const methodologyId = BigInt(id);

  // Check if methodology exists and is active
  const methodology = await prismaClient.methodologyVersion.findUnique({
    where: { id: methodologyId },
    include: {
      _count: {
        select: {
          carbonInventories: {
            where: {
              status: { not: CarbonInventoryLineStatus.DELETED },
            },
          },
        },
      },
    },
  });

  if (!methodology || methodology.status === MethodologyVersionStatus.DELETED) {
    throw new MethodologyNotFoundError();
  }

  if (methodology.status === MethodologyVersionStatus.PUBLISHED) {
    throw new MethodologyIsPublishedError();
  }

  // Check if methodology has active carbon inventories
  if (methodology._count.carbonInventories > 0) {
    throw new MethodologyHasActiveInventoriesError();
  }

  // Soft delete by setting status to DELETED
  await prismaClient.methodologyVersion.update({
    where: { id: methodologyId },
    data: {
      status: MethodologyVersionStatus.DELETED,
      updatedById: null, // TODO: Add from authenticated user
    },
  });
};
