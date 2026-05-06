import type { PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  type GetCarbonInventoryByIdResponse,
  CarbonInventoryLineStatus,
} from "@repo/types";
import { mapCarbonInventoryWithLinesToResponse } from "../mappers.js";
import { map, uniq } from "lodash-es";
import { CarbonInventoryNotFoundError } from "../errors.js";
import {
  calculateDisplayStatus,
  calculateEarnedRecognitions,
  resolveInventoryOrganizationDataReferences,
} from "../helpers.js";

export const getCarbonInventoryByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryByIdResponse> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
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
      submission: {
        include: {
          subject: {
            include: {
              submissions: {
                select: {
                  id: true,
                  status: true,
                  type: true,
                },
              },
            },
          },
        },
      },
      organization: {
        select: {
          summary: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!inventory) throw new CarbonInventoryNotFoundError(id);

  const [subcategories, references] = await Promise.all([
    prismaClient.subcategory.findMany({
      where: {
        id: {
          in: uniq(map(inventory.lines, "subcategoryId")),
        },
      },
      select: {
        id: true,
        dimensions: {
          where: {
            status: EmissionFactorDimensionStatus.ACTIVE,
          },
          select: {
            id: true,
          },
        },
      },
    }),
    resolveInventoryOrganizationDataReferences(
      prismaClient,
      inventory.organizationData
    ),
  ]);

  return {
    ...mapCarbonInventoryWithLinesToResponse(
      inventory,
      subcategories,
      references
    ),
    organizationName: inventory.organization?.summary?.name ?? null,
    status: calculateDisplayStatus(inventory),
    recognitions: calculateEarnedRecognitions(inventory),
  };
};
