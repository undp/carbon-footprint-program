import type { PrismaClient } from "@repo/database";
import {
  type AddSubcategoriesToCarbonInventoryResponse,
  type User,
  CarbonInventoryLineStatus,
} from "@repo/types";
import {
  CarbonInventoryNotFoundError,
  MethodologyNotFoundError,
  SubcategoryNotFoundError,
  SubcategoryNotInMethodologyError,
} from "../errors.js";

export const addSubcategoriesToCarbonInventoryService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  subcategoryIds: bigint[],
  user: User | null
): Promise<AddSubcategoriesToCarbonInventoryResponse> => {
  // First, get the carbon inventory to find its methodologyVersionId
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: {
      id: carbonInventoryId,
    },
    select: {
      methodologyVersionId: true,
    },
  });

  if (!carbonInventory) {
    throw new CarbonInventoryNotFoundError(carbonInventoryId);
  }

  if (!carbonInventory.methodologyVersionId) {
    throw new MethodologyNotFoundError(carbonInventoryId);
  }

  // Fetch all subcategories with category for validation
  const subcategories = await prismaClient.subcategory.findMany({
    where: {
      id: {
        in: subcategoryIds,
      },
    },
    include: {
      category: {
        select: {
          methodologyVersionId: true,
        },
      },
    },
  });

  // Validate all subcategories exist
  if (subcategories.length !== subcategoryIds.length) {
    // Return error for missing subcategory
    throw new SubcategoryNotFoundError();
  }

  // Validate all subcategories belong to the same methodology
  for (const subcategory of subcategories) {
    if (
      subcategory.category.methodologyVersionId !==
      carbonInventory.methodologyVersionId
    ) {
      throw new SubcategoryNotInMethodologyError();
    }
  }

  // Find existing ACTIVE lines for these subcategories in this carbon inventory
  const existingLines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId,
      subcategoryId: {
        in: subcategoryIds,
      },
      status: CarbonInventoryLineStatus.ACTIVE,
    },
    select: {
      subcategoryId: true,
    },
  });

  // Get set of subcategory IDs that already have ACTIVE lines
  const subcategoryIdsWithActiveLines = new Set(
    existingLines.map((line) => line.subcategoryId)
  );

  // Filter out subcategoryIds that already have ACTIVE lines
  const subcategoryIdsToCreate = subcategoryIds.filter(
    (id) => !subcategoryIdsWithActiveLines.has(id)
  );

  // Early return if there's nothing to insert
  if (subcategoryIdsToCreate.length === 0) {
    return {
      added: 0,
      skipped: subcategoryIds.length,
    };
  }

  const userId = user ? BigInt(user.id) : null;

  // Create empty ACTIVE lines for the remaining subcategoryIds
  const recordsToCreate = subcategoryIdsToCreate.map((subcategoryId) => ({
    carbonInventoryId,
    subcategoryId,
    createdById: userId,
    updatedById: userId,
  }));

  await prismaClient.carbonInventoryLine.createMany({
    data: recordsToCreate,
  });

  return {
    added: subcategoryIdsToCreate.length,
    skipped: subcategoryIds.length - subcategoryIdsToCreate.length,
  };
};
