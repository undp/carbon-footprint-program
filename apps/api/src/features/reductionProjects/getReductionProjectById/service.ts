import { type PrismaClient } from "@repo/database";
import { MembershipStatus } from "@repo/database/enums";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { ReductionProjectStatus } from "@repo/types";
import { ReductionProjectNotFoundError } from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  resolveReductionProjectEditAccess,
} from "../helpers.js";
import { mapReductionProjectToGetByIdResponse } from "../mappers.js";

// Sentinel that never matches a real userId; lets us keep the membership
// include in the same query when the request has no resolved user.
const NO_USER_ID = -1n;

export const getReductionProjectByIdService = async (
  prismaClient: PrismaClient,
  id: string,
  userId: bigint | null
): Promise<GetReductionProjectByIdResponse> => {
  const row = await prismaClient.reductionProject.findFirst({
    where: {
      id: BigInt(id),
      status: ReductionProjectStatus.ACTIVE,
    },
    include: {
      subcategory: { select: { id: true, name: true } },
      organization: {
        select: {
          id: true,
          summary: { select: { name: true } },
          memberships: {
            where: {
              userId: userId ?? NO_USER_ID,
              status: MembershipStatus.ACTIVE,
            },
            select: { role: true },
            take: 1,
          },
        },
      },
      carbonInventory: {
        select: { id: true, name: true, year: true },
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
  });

  if (!row) {
    throw new ReductionProjectNotFoundError(id);
  }

  const displayStatus = calculateReductionProjectDisplayStatus(row);
  const canEdit = resolveReductionProjectEditAccess(
    displayStatus,
    row.organization.memberships
  );

  return mapReductionProjectToGetByIdResponse(row, displayStatus, canEdit);
};
