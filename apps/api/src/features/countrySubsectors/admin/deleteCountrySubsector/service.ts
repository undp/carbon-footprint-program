import {
  type PrismaClient,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  Prisma,
} from "@repo/database";
import { type DeleteCountrySubsectorResponse, type User } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySubsectorSelect,
  mapCountrySubsectorToAdmin,
} from "../helpers.js";

export const deleteCountrySubsectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DeleteCountrySubsectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const subsectorId = BigInt(id);

  return await prismaClient.$transaction(async (tx) => {
    const updaterId = BigInt(user.id);

    // Cascade soft-delete: child main activities are deleted along with the subsector.
    // The impact count is shown in the frontend before the user confirms.
    await tx.organizationMainActivity.updateMany({
      where: {
        countrySubsectorId: subsectorId,
        status: OrganizationMainActivityStatus.ACTIVE,
      },
      data: {
        status: OrganizationMainActivityStatus.DELETED,
        updatedById: updaterId,
      },
    });

    try {
      const updated = await tx.countrySubsector.update({
        where: { id: subsectorId },
        data: {
          status: CountrySubsectorStatus.DELETED,
          updatedById: updaterId,
        },
        select: adminCountrySubsectorSelect,
      });
      return mapCountrySubsectorToAdmin(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ResourceNotFoundError("CountrySubsector", id);
      }
      throw error;
    }
  });
};
