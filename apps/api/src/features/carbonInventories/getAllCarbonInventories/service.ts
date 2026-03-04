import type { Prisma, PrismaClient } from "@repo/database";
import {
  type GetAllCarbonInventoriesResponse,
  type GetAllCarbonInventoriesQuery,
  type User,
  CarbonInventoryDisplayStatusEnum,
  CarbonInventoryDisplayStatus,
  InventoryStatus,
  SubmissionSubjectType,
} from "@repo/types";
import { sumBy } from "lodash-es";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { toNumberOrNull, kgToTon } from "@/utils/number.js";

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
        { submission: null },
        {
          submission: {
            subject: {
              subjectType: {
                in: [
                  SubmissionSubjectType.CARBON_INVENTORY_CALCULATION,
                  SubmissionSubjectType.CARBON_INVENTORY_VERIFICATION,
                ],
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
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      // createdAt: "desc",
      id: "asc",
    },
  });

  const TEMP_STATUS: Record<string, CarbonInventoryDisplayStatus> = {
    "0": CarbonInventoryDisplayStatusEnum.DRAFT,
    "1": CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION,
    "2": CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED,
    "3": CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED,
    "4": CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
    "5": CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION,
    "6": CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED,
    "7": CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED,
    "8": CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
    "9": CarbonInventoryDisplayStatusEnum.DELETED,
  };

  return data.map((inventory, idx) => ({
    ...mapCarbonInventoryToResponse(inventory),
    // TODO: use helper to calculate the display status based on the inventory status and associated submissions
    status: TEMP_STATUS[String(idx)] as unknown as CarbonInventoryDisplayStatus, // Temporal status while status management is not implemented yet
    totalEmissions: kgToTon(
      sumBy(inventory.subtotals, ({ value }) => toNumberOrNull(value) ?? 0)
    ),
  }));
};
