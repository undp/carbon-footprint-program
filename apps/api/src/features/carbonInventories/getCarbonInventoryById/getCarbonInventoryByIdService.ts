import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import type { SubcategoryWithDimensions } from "../mappers.js";
import { mapCarbonInventoryWithLinesToResponse } from "../mappers.js";

export const getCarbonInventoryByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryByIdResponse | null> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: {
      id: BigInt(id),
    },
    include: {
      lines: {
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
      },
    },
  });

  if (!inventory) return null;

  // Collect unique subcategory IDs from the lines
  const subcategoryIds = [
    ...new Set(inventory.lines.map((line) => line.subcategoryId)),
  ];

  // Fetch all subcategories with dimensions in a separate query
  const subcategories: SubcategoryWithDimensions[] =
    subcategoryIds.length > 0
      ? await prismaClient.subcategory.findMany({
          where: {
            id: {
              in: subcategoryIds,
            },
          },
          include: {
            dimensions: {
              orderBy: {
                position: "asc",
              },
            },
          },
        })
      : [];

  return mapCarbonInventoryWithLinesToResponse(inventory, subcategories);
};
