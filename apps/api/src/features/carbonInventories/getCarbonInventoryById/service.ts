import type { PrismaClient } from "@repo/database";
import {
  type GetCarbonInventoryByIdResponse,
  CarbonInventoryLineStatus,
} from "@repo/types";
import { mapCarbonInventoryWithLinesToResponse } from "../mappers.js";
import { map, uniq } from "lodash-es";

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
        where: {
          status: CarbonInventoryLineStatus.ACTIVE,
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
      },
    },
  });

  if (!inventory) return null;

  const subcategories = await prismaClient.subcategory.findMany({
    where: {
      id: {
        in: uniq(map(inventory.lines, "subcategoryId")),
      },
    },
    select: {
      id: true,
      dimensions: {
        select: {
          id: true,
        },
      },
    },
  });

  return mapCarbonInventoryWithLinesToResponse(inventory, subcategories);
};
