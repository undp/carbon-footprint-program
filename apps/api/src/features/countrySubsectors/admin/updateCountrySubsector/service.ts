import {
  type PrismaClient,
  Prisma,
  CountrySectorStatus,
  OrganizationMainActivityStatus,
  SubcategoryRecommendationStatus,
} from "@repo/database";
import {
  type UpdateCountrySubsectorRequest,
  type UpdateCountrySubsectorResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ReparentBlockedByReferencesError,
  ResourceNotFoundError,
  attachDetails,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import { normalizeDescriptionInput } from "@/helpers/normalizeDescriptionInput.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySubsectorSelect,
  mapCountrySubsectorToAdmin,
} from "../helpers.js";

export const updateCountrySubsectorService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCountrySubsectorRequest,
  user: User | null
): Promise<UpdateCountrySubsectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const subsectorId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const subsector = await tx.countrySubsector.findUnique({
        where: { id: subsectorId },
        select: { id: true, countrySectorId: true },
      });
      if (!subsector) {
        throw new ResourceNotFoundError("CountrySubsector", id);
      }

      const updateData: Prisma.CountrySubsectorUpdateInput = {
        updater: { connect: { id: BigInt(user.id) } },
      };
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.description !== undefined) {
        updateData.description = normalizeDescriptionInput(data.description);
      }

      // Re-parenting (changing the parent sector) is the only update guarded —
      // editing name/description is always allowed. A genuine re-parent is
      // blocked while the subsector still has dependents, because it would
      // silently move them (and the denormalized parent columns the
      // delete-cascade relies on) to a different sector. Re-association is only
      // allowed by soft-deleting the subsector (which cascades) and re-creating
      // it under the correct sector. Organization data is included because it
      // carries the subsector into a country's carbon inventories, so its parent
      // sector must stay stable.
      if (
        data.countrySectorId !== undefined &&
        BigInt(data.countrySectorId) !== subsector.countrySectorId
      ) {
        const newSectorId = BigInt(data.countrySectorId);
        const parent = await tx.countrySector.findFirst({
          where: { id: newSectorId, status: CountrySectorStatus.ACTIVE },
          select: { id: true },
        });
        if (!parent) {
          throw new ResourceNotFoundError(
            "CountrySector",
            data.countrySectorId
          );
        }

        const [
          activeMainActivityCount,
          activeSubcategoryRecommendationCount,
          organizationDataCount,
        ] = await Promise.all([
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
          tx.organizationData.count({ where: { subsectorId } }),
        ]);

        if (
          activeMainActivityCount > 0 ||
          activeSubcategoryRecommendationCount > 0 ||
          organizationDataCount > 0
        ) {
          const referencedBy: string[] = [];
          if (activeMainActivityCount > 0) referencedBy.push("main activities");
          if (activeSubcategoryRecommendationCount > 0)
            referencedBy.push("subcategory recommendations");
          if (organizationDataCount > 0) referencedBy.push("organization data");

          const error = new ReparentBlockedByReferencesError(
            referencedBy.join(", ")
          );
          throw attachDetails(error, {
            resourceType: "CountrySubsector",
            referencedBy: {
              activeMainActivities: activeMainActivityCount,
              activeSubcategoryRecommendations:
                activeSubcategoryRecommendationCount,
              organizationData: organizationDataCount,
            },
          });
        }

        updateData.countrySector = { connect: { id: newSectorId } };
      }

      const updated = await tx.countrySubsector.update({
        where: { id: subsectorId },
        data: updateData,
        select: adminCountrySubsectorSelect,
      });
      return mapCountrySubsectorToAdmin(updated);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ResourceNotFoundError("CountrySubsector", id);
      }
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
            resourceType: "CountrySubsector",
            context: "UPDATE",
          });
        }
      }
    }
    throw error;
  }
};
