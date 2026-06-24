import {
  type PrismaClient,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  Prisma,
  SubcategoryRecommendationStatus,
} from "@repo/database";
import { type User } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";

export const deleteCountrySubsectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const subsectorId = BigInt(id);
  const updatedById = BigInt(user.id);

  await prismaClient.$transaction(async (tx) => {
    // Soft-delete cascades over the maintainer catalog config that hangs off the
    // subsector, mirroring the methodology standard (see
    // `softDeleteSubcategoryDependents`): main activities and subcategory
    // recommendations under this subsector transition ACTIVE -> DELETED. The
    // parent sector and sibling subsectors are untouched.
    //
    // Organization-owned data (`organization_data.subsectorId`) is deliberately
    // left ACTIVE so deleting a subrubro never rewrites a country's historical
    // footprint; the selector-union keeps those rows rendering for end users.
    try {
      await tx.countrySubsector.update({
        // Scope to ACTIVE so an already-DELETED (or missing) subsector surfaces
        // as not-found (P2025 -> ResourceNotFoundError) instead of silently
        // re-running the cascade, matching the methodology delete standard.
        where: { id: subsectorId, status: CountrySubsectorStatus.ACTIVE },
        data: {
          status: CountrySubsectorStatus.DELETED,
          updatedById,
        },
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ResourceNotFoundError("CountrySubsector", id);
      }
      throw error;
    }

    await tx.organizationMainActivity.updateMany({
      where: {
        countrySubsectorId: subsectorId,
        status: OrganizationMainActivityStatus.ACTIVE,
      },
      data: {
        status: OrganizationMainActivityStatus.DELETED,
        updatedById,
      },
    });

    await tx.subcategoryRecommendation.updateMany({
      where: {
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      data: {
        status: SubcategoryRecommendationStatus.DELETED,
        updatedById,
      },
    });
  });
};
