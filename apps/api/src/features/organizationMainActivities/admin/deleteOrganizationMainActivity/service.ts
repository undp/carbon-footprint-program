import {
  type PrismaClient,
  OrganizationMainActivityStatus,
  Prisma,
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

  // Soft-delete is never blocked by catalog references — no other catalog table
  // references organization_main_activity. User-data references on
  // organization_data.mainActivityId do NOT block.
  try {
    const updated = await prismaClient.organizationMainActivity.update({
      where: { id: activityId },
      data: {
        status: OrganizationMainActivityStatus.DELETED,
        updatedById: BigInt(user.id),
      },
      select: adminMainActivitySelect,
    });
    return mapMainActivityToAdmin(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ResourceNotFoundError("OrganizationMainActivity", id);
    }
    throw error;
  }
};
