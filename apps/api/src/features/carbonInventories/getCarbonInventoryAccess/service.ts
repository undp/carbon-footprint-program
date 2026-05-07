import type { PrismaClient } from "@repo/database";
import { MembershipStatus } from "@repo/database/enums";
import type { GetCarbonInventoryAccessResponse } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";
import {
  calculateDisplayStatus,
  carbonInventoryWithSubmissionsMinimalSelect,
  resolveCarbonInventoryEditAccess,
} from "../helpers.js";

// Sentinel that never matches a real userId; lets us keep the membership
// include in the same query when the request is anonymous (userId is null).
const NO_USER_ID = -1n;

export const getCarbonInventoryAccessService = async (
  prismaClient: PrismaClient,
  id: string,
  userId: bigint | null
): Promise<GetCarbonInventoryAccessResponse> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      createdById: true,
      organizationId: true,
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
      ...carbonInventoryWithSubmissionsMinimalSelect,
    },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  const status = calculateDisplayStatus(inventory);
  const memberships = inventory.organization?.memberships ?? [];
  const canEdit = resolveCarbonInventoryEditAccess(
    {
      createdById: inventory.createdById,
      organizationId: inventory.organizationId,
      status,
    },
    userId,
    memberships
  );
  const membership = memberships[0] ? { role: memberships[0].role } : null;

  return { canEdit, membership };
};
