import {
  type PrismaClient,
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

export const deleteCountrySubsectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const subsectorId = BigInt(id);

  await prismaClient.$transaction(async (tx) => {
    // Soft-delete is blocked by ACTIVE catalog references (see
    // openspec/changes/add-profiling-maintainer/specs/profiling-catalog-behavior/spec.md
    // §"Soft-delete replaces hard-delete and is blocked only by ACTIVE catalog references").
    // User-data references on `organization_data.subsectorId` do NOT block.
    const [activeMainActivityCount, activeSubcategoryRecommendationCount] =
      await Promise.all([
        tx.organizationMainActivity.count({
          where: {
            countrySubsectorId: subsectorId,
            status: OrganizationMainActivityStatus.ACTIVE,
          },
        }),
        tx.subcategoryRecommendation.count({
          where: {
            subsectorId,
            status: SubcategoryRecommendationStatus.ACTIVE,
          },
        }),
      ]);

    if (
      activeMainActivityCount > 0 ||
      activeSubcategoryRecommendationCount > 0
    ) {
      const referencedBy: string[] = [];
      if (activeMainActivityCount > 0)
        referencedBy.push("actividades principales");
      if (activeSubcategoryRecommendationCount > 0)
        referencedBy.push("recomendaciones de subcategoría");

      const error = new DeleteBlockedByReferencesError(referencedBy.join(", "));
      error.message = `No se puede eliminar el subrubro porque aún tiene ${referencedBy.join(", ")} activos asociados.`;
      throw attachDetails(error, {
        resourceType: "CountrySubsector",
        referencedBy: {
          activeMainActivities: activeMainActivityCount,
          activeSubcategoryRecommendations:
            activeSubcategoryRecommendationCount,
        },
      });
    }

    try {
      await tx.countrySubsector.update({
        where: { id: subsectorId },
        data: {
          status: CountrySubsectorStatus.DELETED,
          updatedById: BigInt(user.id),
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
  });
};
