import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventorySubcategoriesSummaryResponse } from "@repo/types";

export type GetCarbonInventorySubcategoriesSummaryResult =
  | { success: true; data: GetCarbonInventorySubcategoriesSummaryResponse }
  | {
      success: false;
      error: "CARBON_INVENTORY_NOT_FOUND" | "METHODOLOGY_NOT_FOUND";
    };

export const getCarbonInventorySubcategoriesSummaryService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint
): Promise<GetCarbonInventorySubcategoriesSummaryResult> => {
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
    // If ACTIVE status doesn't exist, return empty array
    // This shouldn't happen in production, but handle gracefully
    return {
      success: true,
      data: [],
    };
  }

  // Get all subcategories for the methodology version
  const methodology = await prismaClient.methodologyVersion.findUnique({
    where: {
      id: carbonInventory.methodologyVersionId,
    },
    select: {
      categories: {
        select: {
          subcategories: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!methodology) {
    return { success: false, error: "METHODOLOGY_NOT_FOUND" };
  }

  // Flatten subcategories from all categories
  const allSubcategoryIds = methodology.categories.flatMap((category) =>
    category.subcategories.map((subcategory) => subcategory.id)
  );

  // Get all active lines for this carbon inventory with their active inputs
  const activeLines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId: carbonInventoryId,
      statusId: activeStatus.id,
    },
    include: {
      inputs: {
        where: {
          isActive: true,
        },
        take: 1, // Only get the active input
      },
    },
  });

  // Create a map of subcategoryId -> line info
  const hasSubcategoryBeenEdited = new Map<bigint, boolean>();

  for (const line of activeLines) {
    // A subcategory is "edited" if it has an active input
    const hasBeenEdited = Boolean(line.inputs[0]);

    hasSubcategoryBeenEdited.set(
      line.subcategoryId,
      hasSubcategoryBeenEdited.get(line.subcategoryId) || hasBeenEdited
    );
  }

  // Build the response array
  const response: GetCarbonInventorySubcategoriesSummaryResponse =
    allSubcategoryIds.map((subcategoryId) => {
      const hasBeenEdited = hasSubcategoryBeenEdited.get(subcategoryId);
      const included = hasBeenEdited !== undefined;
      const edited = hasBeenEdited ?? false;

      return {
        subcategoryId: Number(subcategoryId),
        included,
        edited,
      };
    });

  return {
    success: true,
    data: response,
  };
};
