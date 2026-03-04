import { SubmissionType, type Prisma, type PrismaClient } from "@repo/database";
import {
  type GetAllCarbonInventoriesResponse,
  type GetAllCarbonInventoriesQuery,
  type User,
  InventoryStatus,
} from "@repo/types";
import { sumBy } from "lodash-es";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { toNumberOrNull, kgToTon } from "@/utils/number.js";
import { calculateDisplayStatus } from "../helpers.js";

export const getAllCarbonInventoriesService = async (
  prismaClient: PrismaClient,
  query: GetAllCarbonInventoriesQuery | null,
  user: User | null
): Promise<GetAllCarbonInventoriesResponse> => {
  // Build where clause for year filtering
  const whereClause: Prisma.CarbonInventoryWhereInput = {
    status: {
      not: InventoryStatus.DELETED, // Exclude deleted inventories
    },
  };

  whereClause.year = query?.year ? parseInt(query.year, 10) : undefined;
  whereClause.createdById = user ? BigInt(user.id) : undefined;

  const data = await prismaClient.carbonInventory.findMany({
    where: {
      ...whereClause,
      OR: [
        { submission: { is: null } },
        {
          submission: {
            subject: {
              submissions: {
                some: {
                  type: {
                    in: [
                      SubmissionType.CARBON_INVENTORY_CALCULATION,
                      SubmissionType.CARBON_INVENTORY_VERIFICATION,
                    ],
                  },
                },
              },
            },
          },
        },
      ],
    },
    include: {
      subtotals: true,
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return data.map((inventory) => ({
    ...mapCarbonInventoryToResponse(inventory),
    status: calculateDisplayStatus(inventory),
    totalEmissions: kgToTon(
      sumBy(inventory.subtotals, ({ value }) => toNumberOrNull(value) ?? 0)
    ),
  }));
};
