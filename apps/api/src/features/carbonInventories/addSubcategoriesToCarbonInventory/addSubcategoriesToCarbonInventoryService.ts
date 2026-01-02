import type { PrismaClient } from "@repo/database";
import type { AddSubcategoriesToCarbonInventoryResponse } from "@repo/types";

export type AddSubcategoriesToCarbonInventoryResult =
  | { success: true; data: AddSubcategoriesToCarbonInventoryResponse }
  | {
      success: false;
      error:
        | "CARBON_INVENTORY_NOT_FOUND"
        | "METHODOLOGY_NOT_FOUND"
        | "SUBCATEGORY_NOT_FOUND"
        | "SUBCATEGORY_NOT_IN_METHODOLOGY";
    };

export const addSubcategoriesToCarbonInventoryService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  subcategoryIds: bigint[]
): Promise<AddSubcategoriesToCarbonInventoryResult> => {
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
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  if (!carbonInventory.methodologyVersionId) {
    return { success: false, error: "METHODOLOGY_NOT_FOUND" };
  }

  // Get the ACTIVE status ID for lines
  const activeStatus = await prismaClient.statusCatalog.findFirst({
    where: {
      scope: "ENTITY",
      code: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!activeStatus) {
    // This shouldn't happen in production, but handle gracefully
    throw new Error("ACTIVE status not found in database");
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
    return { success: false, error: "SUBCATEGORY_NOT_FOUND" };
  }

  // Validate all subcategories belong to the same methodology
  for (const subcategory of subcategories) {
    if (
      subcategory.category.methodologyVersionId !==
      carbonInventory.methodologyVersionId
    ) {
      return { success: false, error: "SUBCATEGORY_NOT_IN_METHODOLOGY" };
    }
  }

  // Find existing ACTIVE lines for these subcategories in this carbon inventory
  const existingLines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId,
      subcategoryId: {
        in: subcategoryIds,
      },
      statusId: activeStatus.id,
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

  // Create empty ACTIVE lines for the remaining subcategoryIds
  await Promise.all(
    subcategoryIdsToCreate.map((subcategoryId) =>
      prismaClient.carbonInventoryLine.create({
        data: {
          carbonInventoryId,
          subcategoryId,
          statusId: activeStatus.id,
          createdById: null, // TODO: Add created by id from logged in user
          updatedById: null, // TODO: Add updated by id from logged in user
        },
      })
    )
  );

  return {
    success: true,
    data: {
      added: subcategoryIdsToCreate.length,
      skipped: subcategoryIds.length - subcategoryIdsToCreate.length,
    },
  };
};
