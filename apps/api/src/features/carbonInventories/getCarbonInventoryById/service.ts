import type { PrismaClient } from "@repo/database";
import {
  type GetCarbonInventoryByIdResponse,
  CarbonInventoryLineStatus,
  User,
} from "@repo/types";
import { mapCarbonInventoryWithLinesToResponse } from "../mappers.js";
import { map, uniq } from "lodash-es";
import { CarbonInventoryNotFoundError } from "../errors.js";

export const getCarbonInventoryByIdService = async (
  prismaClient: PrismaClient,
  id: string,
  user?: User | null
): Promise<GetCarbonInventoryByIdResponse> => {
  const inventory = await prismaClient.carbonInventory.findFirst({
    where: {
      id: BigInt(id),
      createdById: user ? BigInt(user.id) : null,
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

  if (!inventory) throw new CarbonInventoryNotFoundError(id);

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
