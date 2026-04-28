import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  Prisma,
} from "@repo/database";
import { type DeleteCountrySectorResponse, type User } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySectorSelect,
  mapCountrySectorToAdmin,
} from "../helpers.js";

export const deleteCountrySectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DeleteCountrySectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(id);

  return await prismaClient.$transaction(async (tx) => {
    const updaterId = BigInt(user.id);

    // Cascade soft-delete: deepest level first. Children and external references
    // pointing at these rows remain with FK to a DELETED row — the frontend shows
    // the impact counts in a confirmation dialog (see DeleteWarningDialog) so the
    // user can decide informed.
    await tx.organizationMainActivity.updateMany({
      where: {
        countrySectorId: sectorId,
        status: OrganizationMainActivityStatus.ACTIVE,
      },
      data: {
        status: OrganizationMainActivityStatus.DELETED,
        updatedById: updaterId,
      },
    });
    await tx.countrySubsector.updateMany({
      where: {
        countrySectorId: sectorId,
        status: CountrySubsectorStatus.ACTIVE,
      },
      data: {
        status: CountrySubsectorStatus.DELETED,
        updatedById: updaterId,
      },
    });

    try {
      const updated = await tx.countrySector.update({
        where: { id: sectorId },
        data: {
          status: CountrySectorStatus.DELETED,
          updatedById: updaterId,
        },
        select: adminCountrySectorSelect,
      });
      return mapCountrySectorToAdmin(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ResourceNotFoundError("CountrySector", id);
      }
      throw error;
    }
  });
};
