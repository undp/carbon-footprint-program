import { InventoryStatus, type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  MethodologyVersionStatus,
  type User,
} from "@repo/types";
import {
  MethodologyHasActiveInventoriesError,
  MethodologyIsPublishedError,
  MethodologyNotFoundError,
} from "../errors.js";

export const deleteMethodologyService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
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
              status: { not: InventoryStatus.DELETED },
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

  // Use transaction to soft-delete methodology AND cascade to categories
  await prismaClient.$transaction(async (tx) => {
    // Soft delete all active categories for this methodology
    await tx.category.updateMany({
      where: {
        methodologyVersionId: methodologyId,
        status: { not: CategoryStatus.DELETED },
      },
      data: {
        status: CategoryStatus.DELETED,
        updatedById: user ? BigInt(user.id) : null,
      },
    });

    // Soft delete the methodology itself
    await tx.methodologyVersion.update({
      where: { id: methodologyId },
      data: {
        status: MethodologyVersionStatus.DELETED,
        updatedById: user ? BigInt(user.id) : null,
      },
    });
  });
};
