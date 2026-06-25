import {
  type PrismaClient,
  Prisma,
  CountrySectorStatus,
  InventoryStatus,
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
      // editing name/description is always allowed, so we only fetch the current
      // parent here (not on every patch). A genuine re-parent is blocked while
      // the subsector still has dependents, because it would silently move them
      // (and the denormalized parent columns the delete-cascade relies on) to a
      // different sector. Re-association is only allowed by soft-deleting the
      // subsector (which cascades) and re-creating it under the correct sector.
      // Two denormalizations carry the subsector outside its own table and must
      // stay consistent with its parent sector: the live `organization_data` rows,
      // and the frozen `carbon_inventory.organizationData` JSON snapshot (which
      // stores `sectorId` + `subsectorId` as a point-in-time pair, written as
      // strings — see `buildOrganizationDataSnapshot`). The snapshot is an
      // independent copy, so it can reference this subsector even when no live
      // organization_data row does; re-parenting would leave its sector/subsector
      // pair pointing at a combination that no longer exists in the catalog.
      if (data.countrySectorId !== undefined) {
        const subsector = await tx.countrySubsector.findUnique({
          where: { id: subsectorId },
          select: { countrySectorId: true },
        });
        if (!subsector) {
          throw new ResourceNotFoundError("CountrySubsector", id);
        }

        if (BigInt(data.countrySectorId) !== subsector.countrySectorId) {
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
            carbonInventoryCount,
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
            // The snapshot stores `subsectorId` as a string (see
            // `buildOrganizationDataSnapshot`), so match against the string form.
            // Only ACTIVE inventories matter — a DELETED inventory's frozen pair
            // is inert and should not block re-parenting.
            tx.carbonInventory.count({
              where: {
                status: InventoryStatus.ACTIVE,
                organizationData: {
                  path: ["subsectorId"],
                  equals: subsectorId.toString(),
                },
              },
            }),
          ]);

          if (
            activeMainActivityCount > 0 ||
            activeSubcategoryRecommendationCount > 0 ||
            organizationDataCount > 0 ||
            carbonInventoryCount > 0
          ) {
            const referencedBy: string[] = [];
            if (activeMainActivityCount > 0)
              referencedBy.push("main activities");
            if (activeSubcategoryRecommendationCount > 0)
              referencedBy.push("subcategory recommendations");
            if (organizationDataCount > 0)
              referencedBy.push("organization data");
            if (carbonInventoryCount > 0)
              referencedBy.push("carbon inventories");

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
                carbonInventories: carbonInventoryCount,
              },
            });
          }

          updateData.countrySector = { connect: { id: newSectorId } };
        }
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
