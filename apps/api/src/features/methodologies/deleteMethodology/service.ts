import { InventoryStatus, type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
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
import { softDeleteSubcategoryDependents } from "../../../helpers/softDeleteSubcategoryDependents.js";

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

  // Use a transaction to soft-delete the methodology version together with its
  // whole tree: subcategory dependents (via the shared helper), then the
  // subcategories and categories themselves.
  await prismaClient.$transaction(async (tx) => {
    // Check if methodology exists and is active
    const methodology = await tx.methodologyVersion.findUnique({
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

    if (
      !methodology ||
      methodology.status === MethodologyVersionStatus.DELETED
    ) {
      throw new MethodologyNotFoundError();
    }

    if (methodology.status === MethodologyVersionStatus.PUBLISHED) {
      throw new MethodologyIsPublishedError();
    }

    // Check if methodology has active carbon inventories
    if (methodology._count.carbonInventories > 0) {
      throw new MethodologyHasActiveInventoriesError();
    }

    const updatedById = BigInt(user.id);

    await softDeleteSubcategoryDependents(
      tx,
      { category: { methodologyVersionId: methodologyId } },
      updatedById
    );

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
