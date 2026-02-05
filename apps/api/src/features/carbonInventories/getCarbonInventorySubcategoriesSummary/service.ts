import type { PrismaClient } from "@repo/database";
import {
  type GetCarbonInventorySubcategoriesSummaryResponse,
  CarbonInventoryLineStatus,
} from "@repo/types";
import { isCarbonInventoryLineEdited } from "../utils.js";

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
      status: CarbonInventoryLineStatus.ACTIVE,
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
    const hasBeenEdited = isCarbonInventoryLineEdited(line);
    const previousValue = hasSubcategoryBeenEdited.get(line.subcategoryId);

    hasSubcategoryBeenEdited.set(
      line.subcategoryId,
      previousValue || hasBeenEdited
    );
  }

  // Build the response array
  const response: GetCarbonInventorySubcategoriesSummaryResponse =
    allSubcategoryIds.map((subcategoryId) => {
      const hasBeenEdited = hasSubcategoryBeenEdited.get(subcategoryId);
      const included = hasBeenEdited !== undefined;
      const edited = hasBeenEdited ?? false;

      return {
        subcategoryId: subcategoryId.toString(),
        included,
        edited,
      };
    });

  return {
    success: true,
    data: response,
  };
};
