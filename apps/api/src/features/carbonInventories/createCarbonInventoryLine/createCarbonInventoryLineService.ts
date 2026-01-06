import type { PrismaClient } from "@repo/database";
import type { CreateCarbonInventoryLineResponse } from "@repo/types";
import { mapLineToResponse } from "../mappers.js";

export type CreateCarbonInventoryLineResult =
  | { success: true; data: CreateCarbonInventoryLineResponse }
  | {
      success: false;
      error:
        | "CARBON_INVENTORY_NOT_FOUND"
        | "METHODOLOGY_NOT_FOUND"
        | "SUBCATEGORY_NOT_FOUND"
        | "SUBCATEGORY_NOT_IN_METHODOLOGY";
    };

export const createCarbonInventoryLineService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  subcategoryId: bigint
): Promise<CreateCarbonInventoryLineResult> => {
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

  // Fetch subcategory and category for both validation and mapping
  const subcategoryWithCategory = await prismaClient.subcategory.findUnique({
    where: {
      id: subcategoryId,
    },
    include: {
      category: {
        select: {
          methodologyVersionId: true,
        },
      },
    },
  });

  if (!subcategoryWithCategory) {
    return { success: false, error: "SUBCATEGORY_NOT_FOUND" };
  }

  if (
    subcategoryWithCategory.category.methodologyVersionId !==
    carbonInventory.methodologyVersionId
  ) {
    return { success: false, error: "SUBCATEGORY_NOT_IN_METHODOLOGY" };
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
    // Return a generic error since this is an internal issue
    throw new Error("ACTIVE status not found in database");
  }

  // Create the line with inputs included (empty for a new line, but needed for the mapper type)
  const line = await prismaClient.carbonInventoryLine.create({
    data: {
      carbonInventoryId,
      subcategoryId,
      statusId: activeStatus.id,
      createdById: null, // TODO: Add created by id from logged in user
      updatedById: null, // TODO: Add updated by id from logged in user
    },
    include: {
      inputs: {
        where: {
          isActive: true,
        },
        include: {
          factor: true,
        },
        take: 1, // Only get the active input
      },
    },
  });

  return {
    success: true,
    data: mapLineToResponse(line),
  };
};
