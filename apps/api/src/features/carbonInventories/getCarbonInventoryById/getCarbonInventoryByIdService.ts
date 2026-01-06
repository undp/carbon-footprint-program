import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import { mapCarbonInventoryWithLinesToResponse } from "../mappers.js";
import { ApplicationConfigError } from "@/errors/index.js";

export const getCarbonInventoryByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryByIdResponse | null> => {
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
    // This is a configuration error - the ACTIVE status must exist in the database
    const errorContext = {
      lookup: "statusCatalog",
      scope: "ENTITY",
      code: "ACTIVE",
    };
    throw new ApplicationConfigError(
      `Required status lookup failed: statusCatalog with scope="${errorContext.scope}" and code="${errorContext.code}" not found. This indicates a database configuration issue.`
    );
  }

  const inventory = await prismaClient.carbonInventory.findUnique({
    where: {
      id: BigInt(id),
    },
    include: {
      lines: {
        where: {
          statusId: activeStatus.id,
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

  return mapCarbonInventoryWithLinesToResponse(inventory);
};
