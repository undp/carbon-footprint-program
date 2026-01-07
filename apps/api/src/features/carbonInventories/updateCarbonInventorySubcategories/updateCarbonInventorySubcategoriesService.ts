import type { PrismaClient } from "@repo/database";
import type { UpdateCarbonInventorySubcategoriesRequest } from "@repo/types";
import type { UpdateCarbonInventorySubcategoriesResponse } from "@repo/types";
import { groupBy } from "lodash-es";
import { isCarbonInventoryLineEdited } from "../utils.js";

export type UpdateCarbonInventorySubcategoriesResult =
  | { success: true; data: UpdateCarbonInventorySubcategoriesResponse }
  | {
      success: false;
      error:
        | "CARBON_INVENTORY_NOT_FOUND"
        | "METHODOLOGY_NOT_FOUND"
        | "SUBCATEGORY_NOT_FOUND"
        | "SUBCATEGORY_NOT_IN_METHODOLOGY"
        | "SUBCATEGORY_HAS_NON_EMPTY_LINES";
    };

export const updateCarbonInventorySubcategoriesService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  request: UpdateCarbonInventorySubcategoriesRequest
): Promise<UpdateCarbonInventorySubcategoriesResult> => {
  // First, get the carbon inventory to find its methodologyVersionId
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: {
      id: carbonInventoryId,
    },
    select: {
      id: true,
      methodologyVersionId: true,
    },
  });

  if (!carbonInventory) {
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  if (!carbonInventory.methodologyVersionId) {
    return { success: false, error: "METHODOLOGY_NOT_FOUND" };
  }

  // Get status IDs
  const [activeStatus, deletedStatus] = await Promise.all([
    prismaClient.statusCatalog.findFirst({
      where: {
        scope: "ENTITY",
        code: "ACTIVE",
      },
      select: {
        id: true,
      },
    }),
    prismaClient.statusCatalog.findFirst({
      where: {
        scope: "ENTITY",
        code: "DELETED",
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!activeStatus || !deletedStatus) {
    throw new Error("ACTIVE or DELETED status not found in database");
  }

  // Extract subcategory IDs from request
  const subcategoryIds = request.map(({ id }) => BigInt(id));

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

  // Fetch existing ACTIVE lines for these subcategories
  const existingLines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId,
      subcategoryId: {
        in: subcategoryIds,
      },
      statusId: activeStatus.id,
    },
    include: {
      inputs: {
        where: {
          isActive: true,
        },
        take: 1,
      },
    },
  });

  // Group lines by subcategoryId (a subcategory can have multiple lines)
  const linesBySubcategoryId = groupBy(existingLines, (line) =>
    line.subcategoryId.toString()
  );

  // Check for non-empty lines before processing (for subcategories being deselected)
  // A subcategory cannot be removed if ANY of its lines are non-empty
  for (const item of request) {
    if (!item.selected) {
      const lines = linesBySubcategoryId[item.id] ?? [];
      // Check if ANY line is non-empty
      for (const line of lines) {
        if (isCarbonInventoryLineEdited(line)) {
          return { success: false, error: "SUBCATEGORY_HAS_NON_EMPTY_LINES" };
        }
      }
    }
  }

  // Track counts
  let addedCount = 0;
  let removedCount = 0;
  let skippedCount = 0;

  // Process each subcategory update in a transaction
  await prismaClient.$transaction(async (tx) => {
    for (const item of request) {
      const subcategoryId = BigInt(item.id);
      const lines = linesBySubcategoryId[item.id] ?? [];

      if (item.selected) {
        // User wants to select this subcategory
        if (lines.length > 0) {
          // At least one ACTIVE line already exists, skip
          skippedCount++;
        } else {
          // No lines exist, create an empty ACTIVE line
          await tx.carbonInventoryLine.create({
            data: {
              carbonInventoryId,
              subcategoryId,
              statusId: activeStatus.id,
              createdById: null, // TODO: Add created by id from logged in user
              updatedById: null, // TODO: Add updated by id from logged in user
            },
          });
          addedCount++;
        }
      } else {
        // User wants to deselect this subcategory
        if (lines.length === 0) {
          // No lines exist, skip
          skippedCount++;
        } else {
          // All lines are empty (already validated above), soft delete all of them
          const lineIds = lines.map((line) => line.id);
          await tx.carbonInventoryLine.updateMany({
            where: {
              id: {
                in: lineIds,
              },
            },
            data: {
              statusId: deletedStatus.id,
              updatedById: null, // TODO: Add updated by id from logged in user
            },
          });
          removedCount++; // Count subcategories removed, not lines
        }
      }
    }
  });

  return {
    success: true,
    data: {
      added: addedCount,
      removed: removedCount,
      skipped: skippedCount,
    },
  };
};
