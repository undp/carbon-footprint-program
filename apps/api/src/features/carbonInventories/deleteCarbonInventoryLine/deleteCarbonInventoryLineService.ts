import type { PrismaClient } from "@repo/database";

export type DeleteCarbonInventoryLineResult =
  | { success: true }
  | {
      success: false;
      error:
        | "CARBON_INVENTORY_NOT_FOUND"
        | "SUBCATEGORY_NOT_FOUND"
        | "LINE_NOT_FOUND"
        | "LINE_NOT_IN_CARBON_INVENTORY"
        | "LINE_NOT_IN_SUBCATEGORY";
    };

export const deleteCarbonInventoryLineService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  subcategoryId: bigint,
  lineId: bigint
): Promise<DeleteCarbonInventoryLineResult> => {
  // Get the DELETED status ID first to check if line is already deleted
  const deletedStatus = await prismaClient.statusCatalog.findFirst({
    where: {
      scope: "ENTITY",
      code: "DELETED",
    },
    select: {
      id: true,
    },
  });

  if (!deletedStatus) {
    // This shouldn't happen in production, but handle gracefully
    throw new Error("DELETED status not found in database");
  }

  // Fetch the line with its carbon inventory and subcategory in a single query
  // This allows us to validate all relationships in one database round trip
  const line = await prismaClient.carbonInventoryLine.findUnique({
    where: {
      id: lineId,
    },
    select: {
      id: true,
      carbonInventoryId: true,
      subcategoryId: true,
      statusId: true,
      carbonInventory: {
        select: {
          id: true,
        },
      },
      subcategory: {
        select: {
          id: true,
        },
      },
    },
  });

  // If line doesn't exist, return generic error
  if (!line) {
    return { success: false, error: "LINE_NOT_FOUND" };
  }

  // If line is already deleted, treat it as not found (deleted lines should not be visible)
  if (line.statusId === deletedStatus.id) {
    return { success: false, error: "LINE_NOT_FOUND" };
  }

  // Validate carbon inventory matches
  if (line.carbonInventoryId !== carbonInventoryId) {
    return { success: false, error: "LINE_NOT_IN_CARBON_INVENTORY" };
  }

  // Validate subcategory matches
  if (line.subcategoryId !== subcategoryId) {
    return { success: false, error: "LINE_NOT_IN_SUBCATEGORY" };
  }

  // Additional validation: ensure the related entities exist
  // (This should never fail if the line exists, but provides extra safety)
  if (!line.carbonInventory) {
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  if (!line.subcategory) {
    return { success: false, error: "SUBCATEGORY_NOT_FOUND" };
  }

  // Soft delete: update the line's status to DELETED
  await prismaClient.carbonInventoryLine.update({
    where: {
      id: lineId,
    },
    data: {
      statusId: deletedStatus.id,
      updatedById: null, // TODO: Add updated by id from logged in user
    },
  });

  return { success: true };
};
