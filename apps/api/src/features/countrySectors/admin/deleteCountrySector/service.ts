import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  Prisma,
  SubcategoryRecommendationStatus,
} from "@repo/database";
import { type User } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";

export const deleteCountrySectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(id);
  const updatedById = BigInt(user.id);

  await prismaClient.$transaction(async (tx) => {
    // Soft-delete cascades over the maintainer catalog config that hangs off the
    // sector, mirroring the methodology standard (see
    // `softDeleteSubcategoryDependents`): subsectors, main activities and
    // subcategory recommendations all transition ACTIVE -> DELETED.
    //
    // The cascade relies on the catalog's denormalized parent columns: every
    // main activity under one of the sector's subsectors also stores
    // `countrySectorId` (createOrganizationMainActivity backfills it), and every
    // recommendation carries a non-null `sectorId`, so filtering by the sector
    // alone reaches the whole subtree without first resolving subsector ids.
    //
    // Organization-owned data (`organization_data.sectorId`) is deliberately
    // left ACTIVE so deleting a rubro never rewrites a country's historical
    // footprint; the selector-union keeps those rows rendering for end users.
    try {
      await tx.countrySector.update({
        // Scope to ACTIVE so an already-DELETED (or missing) sector surfaces as
        // not-found (P2025 -> ResourceNotFoundError) instead of silently
        // re-running the cascade, matching the methodology delete standard.
        where: { id: sectorId, status: CountrySectorStatus.ACTIVE },
        data: {
          status: CountrySectorStatus.DELETED,
          updatedById,
        },
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ResourceNotFoundError("CountrySector", id);
      }
      throw error;
    }

    await tx.countrySubsector.updateMany({
      where: {
        countrySectorId: sectorId,
        status: CountrySubsectorStatus.ACTIVE,
      },
      data: {
        status: CountrySubsectorStatus.DELETED,
        updatedById,
      },
    });

    await tx.organizationMainActivity.updateMany({
      where: {
        countrySectorId: sectorId,
        status: OrganizationMainActivityStatus.ACTIVE,
      },
      data: {
        status: OrganizationMainActivityStatus.DELETED,
        updatedById,
      },
    });

    await tx.subcategoryRecommendation.updateMany({
      where: {
        sectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      data: {
        status: SubcategoryRecommendationStatus.DELETED,
        updatedById,
      },
    });
  });
};
