import { type PrismaClient } from "@repo/database";
import { MembershipStatus } from "@repo/database/enums";
import type { GetReductionProjectAccessResponse } from "@repo/types";
import { ReductionProjectStatus } from "@repo/types";
import { ReductionProjectNotFoundError } from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  resolveReductionProjectEditAccess,
  reductionProjectWithSubmissionsMinimalSelect,
} from "../helpers.js";

// Sentinel that never matches a real userId; lets us keep the membership
// include in the same query when the request has no resolved user.
const NO_USER_ID = -1n;

export const getReductionProjectAccessService = async (
  prismaClient: PrismaClient,
  id: string,
  userId: bigint | null
): Promise<GetReductionProjectAccessResponse> => {
  const row = await prismaClient.reductionProject.findFirst({
    where: {
      id: BigInt(id),
      status: ReductionProjectStatus.ACTIVE,
    },
    select: {
      ...reductionProjectWithSubmissionsMinimalSelect,
      organization: {
        select: {
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
    },
  });

  if (!row) {
    throw new ReductionProjectNotFoundError(id);
  }

  const displayStatus = calculateReductionProjectDisplayStatus(row);
  const canEdit = resolveReductionProjectEditAccess(
    displayStatus,
    row.organization?.memberships ?? []
  );

  return { canEdit };
};
