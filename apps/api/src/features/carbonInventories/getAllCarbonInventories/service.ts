import {
  SubmissionType,
  type Prisma,
  type PrismaClient,
  MembershipStatus,
} from "@repo/database";
import {
  type GetAllCarbonInventoriesResponse,
  type GetAllCarbonInventoriesQuery,
  type User,
  InventoryStatus,
} from "@repo/types";
import { sumBy } from "lodash-es";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { toNumberOrNull, kgToTon } from "@/utils/number.js";
import {
  calculateDisplayStatus,
  calculateEarnedRecognitions,
} from "../helpers.js";

export const getAllCarbonInventoriesService = async (
  prismaClient: PrismaClient,
  query: GetAllCarbonInventoriesQuery | null,
  user: User | null
): Promise<GetAllCarbonInventoriesResponse> => {
  // Base filters
  const baseFilters: Prisma.CarbonInventoryWhereInput = {
    status: InventoryStatus.ACTIVE,
  };

  if (query?.year) {
    baseFilters.year = parseInt(query.year, 10);
  }

  if (query?.organizationId) {
    baseFilters.organizationId = BigInt(query.organizationId);
  }

  if (query?.withoutOrganization) {
    baseFilters.organizationId = null;
  }

  // Access control: show inventories created by user OR belonging to orgs where user is a member
  // TODO: refactor user usage when FastifyRequest is improved for authenticated requests
  const accessControlFilter: Prisma.CarbonInventoryWhereInput = user
    ? {
        OR: [
          // User created the inventory
          {
            createdById: BigInt(user.id),
          },
          // Inventory belongs to organization where user has active membership
          {
            organization: {
              memberships: {
                some: {
                  userId: BigInt(user.id),
                  status: MembershipStatus.ACTIVE,
                },
              },
            },
          },
        ],
      }
    : {};

  // Submission filtering (existing logic)
  const submissionFilter: Prisma.CarbonInventoryWhereInput = {
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
  };

  const data = await prismaClient.carbonInventory.findMany({
    where: {
      AND: [baseFilters, accessControlFilter, submissionFilter],
    },
    include: {
      subtotals: true,
      organization: {
        include: {
          summary: {
            select: {
              name: true,
              displayStatus: true,
            },
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
    organizationName: inventory.organization?.summary?.name ?? null,
    organizationDisplayStatus:
      inventory.organization?.summary?.displayStatus ?? null,
    recognitions: calculateEarnedRecognitions(inventory),
    areAllActiveLinesCompleted:
      inventory.subtotals.length > 0 &&
      inventory.subtotals.every(
        ({ activeLinesCount, activeCompletedLinesCount }) =>
          activeLinesCount === activeCompletedLinesCount
      ),
  }));
};
