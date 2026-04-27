import {
  type PrismaClient,
  OrganizationMainActivityStatus,
} from "@repo/database";
import {
  type DeleteOrganizationMainActivityResponse,
  type User,
} from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import { adminMainActivitySelect, mapMainActivityToAdmin } from "../helpers.js";

export const deleteOrganizationMainActivityService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DeleteOrganizationMainActivityResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const activityId = BigInt(id);

  return await prismaClient.$transaction(async (tx) => {
    const existing = await tx.organizationMainActivity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });
    if (!existing) {
      throw new ResourceNotFoundError("OrganizationMainActivity", id);
    }

    // Soft-delete is never blocked by catalog references — no other catalog table
    // references organization_main_activity. User-data references on
    // organization_data.mainActivityId do NOT block.
    const updated = await tx.organizationMainActivity.update({
      where: { id: activityId },
      data: {
        status: OrganizationMainActivityStatus.DELETED,
        updatedById: BigInt(user.id),
      },
      select: adminMainActivitySelect,
    });

    return mapMainActivityToAdmin(updated);
  });
};
