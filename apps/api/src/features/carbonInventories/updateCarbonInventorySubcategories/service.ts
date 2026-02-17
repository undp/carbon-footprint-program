import type { PrismaClient } from "@repo/database";
import {
  type UpdateCarbonInventorySubcategoriesRequest,
  type UpdateCarbonInventorySubcategoriesResponse,
  CarbonInventoryLineStatus,
  type User,
} from "@repo/types";
import { groupBy } from "lodash-es";
import { isCarbonInventoryLineEdited } from "../utils.js";
import createError from "@fastify/error";
import {
  CarbonInventoryNotFoundError,
  MethodologyNotFoundError,
  SubcategoryNotFoundError,
  SubcategoryNotInMethodologyError,
} from "../errors.js";

const SubcategoryHasNonEmptyLinesError = createError(
  "SUBCATEGORY_HAS_NON_EMPTY_LINES",
  "Cannot remove subcategory with non-empty lines. Please delete or empty the lines first.",
  422
);

export const updateCarbonInventorySubcategoriesService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  request: UpdateCarbonInventorySubcategoriesRequest,
  user: User | null
): Promise<UpdateCarbonInventorySubcategoriesResponse> => {
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

  if (!carbonInventory)
    throw new CarbonInventoryNotFoundError(carbonInventoryId);

  if (!carbonInventory.methodologyVersionId)
    throw new MethodologyNotFoundError(carbonInventoryId);

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
  if (subcategories.length !== subcategoryIds.length)
    throw new SubcategoryNotFoundError();

  // Validate all subcategories belong to the same methodology
  for (const subcategory of subcategories) {
    if (
      subcategory.category.methodologyVersionId !==
      carbonInventory.methodologyVersionId
    )
      throw new SubcategoryNotInMethodologyError();
  }

  // Fetch existing ACTIVE lines for these subcategories
  const existingLines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId,
      subcategoryId: {
        in: subcategoryIds,
      },
      status: CarbonInventoryLineStatus.ACTIVE,
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
        if (isCarbonInventoryLineEdited(line))
          throw new SubcategoryHasNonEmptyLinesError();
      }
    }
  }

  // Track counts
  let addedCount = 0;
  let removedCount = 0;
  let skippedCount = 0;

  const userId = user ? BigInt(user.id) : null;

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
              status: CarbonInventoryLineStatus.ACTIVE,
              createdById: userId,
              updatedAt: null,
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
              status: CarbonInventoryLineStatus.DELETED,
              updatedById: userId,
            },
          });
          removedCount++; // Count subcategories removed, not lines
        }
      }
    }
  });

  return {
    added: addedCount,
    removed: removedCount,
    skipped: skippedCount,
  };
};
