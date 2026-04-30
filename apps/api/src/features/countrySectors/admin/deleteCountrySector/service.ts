import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  Prisma,
  SubcategoryRecommendationStatus,
} from "@repo/database";
import { type User } from "@repo/types";
import {
  attachDetails,
  DeleteBlockedByReferencesError,
  ResourceNotFoundError,
} from "@/errors/index.js";
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

  await prismaClient.$transaction(async (tx) => {
    // Soft-delete is blocked by ACTIVE catalog references (see
    // openspec/changes/add-profiling-maintainer/specs/profiling-catalog-behavior/spec.md
    // §"Soft-delete replaces hard-delete and is blocked only by ACTIVE catalog references").
    // User-data references on `organization_data.sectorId` do NOT block.
    const [
      activeSubsectorCount,
      activeMainActivityCount,
      activeSubcategoryRecommendationCount,
    ] = await Promise.all([
      tx.countrySubsector.count({
        where: {
          countrySectorId: sectorId,
          status: CountrySubsectorStatus.ACTIVE,
        },
      }),
      tx.organizationMainActivity.count({
        where: {
          countrySectorId: sectorId,
          status: OrganizationMainActivityStatus.ACTIVE,
        },
      }),
      tx.subcategoryRecommendation.count({
        where: {
          sectorId,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      }),
    ]);

    if (
      activeSubsectorCount > 0 ||
      activeMainActivityCount > 0 ||
      activeSubcategoryRecommendationCount > 0
    ) {
      const referencedBy: string[] = [];
      if (activeSubsectorCount > 0) referencedBy.push("subrubros");
      if (activeMainActivityCount > 0)
        referencedBy.push("actividades principales");
      if (activeSubcategoryRecommendationCount > 0)
        referencedBy.push("recomendaciones de subcategoría");

      const error = new DeleteBlockedByReferencesError(referencedBy.join(", "));
      error.message = `No se puede eliminar el rubro porque aún tiene ${referencedBy.join(", ")} activos asociados.`;
      throw attachDetails(error, {
        resourceType: "CountrySector",
        referencedBy: {
          activeSubsectors: activeSubsectorCount,
          activeMainActivities: activeMainActivityCount,
          activeSubcategoryRecommendations:
            activeSubcategoryRecommendationCount,
        },
      });
    }

    try {
      await tx.countrySector.update({
        where: { id: sectorId },
        data: {
          status: CountrySectorStatus.DELETED,
          updatedById: BigInt(user.id),
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
  });
};
