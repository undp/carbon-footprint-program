import { InventoryStatus, type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
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
import { UserNotFoundError } from "../../users/errors.js";

export const deleteMethodologyService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }

  const methodologyId = BigInt(id);

  // Check if methodology exists and is active
  const methodology = await prismaClient.methodologyVersion.findUnique({
    where: { id: methodologyId },
    include: {
      _count: {
        select: {
          carbonInventories: {
            where: {
              status: InventoryStatus.ACTIVE,
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
    const updatedById = BigInt(user.id);

    await tx.emissionFactor.updateMany({
      where: {
        subcategory: { category: { methodologyVersionId: methodologyId } },
        status: EmissionFactorStatus.ACTIVE,
      },
      data: { status: EmissionFactorStatus.DELETED, updatedById },
    });

    await tx.emissionFactorDimensionValue.updateMany({
      where: {
        dimension: {
          subcategory: { category: { methodologyVersionId: methodologyId } },
        },
        status: EmissionFactorDimensionValueStatus.ACTIVE,
      },
      data: { status: EmissionFactorDimensionValueStatus.DELETED, updatedById },
    });

    await tx.emissionFactorDimension.updateMany({
      where: {
        subcategory: { category: { methodologyVersionId: methodologyId } },
        status: EmissionFactorDimensionStatus.ACTIVE,
      },
      data: { status: EmissionFactorDimensionStatus.DELETED, updatedById },
    });

    await tx.subcategory.updateMany({
      where: {
        category: { methodologyVersionId: methodologyId },
        status: SubcategoryStatus.ACTIVE,
      },
      data: { status: SubcategoryStatus.DELETED, updatedById },
    });

    await tx.category.updateMany({
      where: {
        methodologyVersionId: methodologyId,
        status: CategoryStatus.ACTIVE,
      },
      data: { status: CategoryStatus.DELETED, updatedById },
    });

    await tx.methodologyVersion.update({
      where: { id: methodologyId },
      data: { status: MethodologyVersionStatus.DELETED, updatedById },
    });
  });
};
