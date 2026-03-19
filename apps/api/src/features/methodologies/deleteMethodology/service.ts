import { InventoryStatus, type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  EmissionFactorStatus,
  MethodologyVersionStatus,
  SubcategoryStatus,
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

  // Use transaction to soft-delete methodology AND cascade to categories, subcategories, emission factors
  await prismaClient.$transaction(async (tx) => {
    const updatedById = user ? BigInt(user.id) : null;

    await tx.emissionFactor.updateMany({
      where: {
        subcategory: { category: { methodologyVersionId: methodologyId } },
        status: { not: EmissionFactorStatus.DELETED },
      },
      data: { status: EmissionFactorStatus.DELETED, updatedById },
    });

    await tx.subcategory.updateMany({
      where: {
        category: { methodologyVersionId: methodologyId },
        status: { not: SubcategoryStatus.DELETED },
      },
      data: { status: SubcategoryStatus.DELETED, updatedById },
    });

    await tx.category.updateMany({
      where: {
        methodologyVersionId: methodologyId,
        status: { not: CategoryStatus.DELETED },
      },
      data: { status: CategoryStatus.DELETED, updatedById },
    });

    await tx.methodologyVersion.update({
      where: { id: methodologyId },
      data: { status: MethodologyVersionStatus.DELETED, updatedById },
    });
  });
};
