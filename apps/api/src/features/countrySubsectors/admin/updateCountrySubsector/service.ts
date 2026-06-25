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
  EditBlockedByReferencesError,
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

      // Identity-changing edits to a subsector are guarded; description-only edits
      // are always allowed, so the current row is fetched only when name or parent
      // is touched. Two kinds of edit corrupt existing references and are blocked:
      //
      //  - Re-parenting (changing the parent sector) would silently move dependents —
      //    and the denormalized parent columns the delete-cascade relies on — to a
      //    different sector. Blocked while the subsector has ANY dependent: catalog
      //    children (active main activities / subcategory recommendations), live
      //    `organization_data` rows, or an ACTIVE carbon-inventory snapshot.
      //  - Renaming a subsector a user already selected would make that user see a
      //    name they never chose. Blocked while USER data references it (live
      //    `organization_data` or an ACTIVE snapshot); catalog children alone do NOT
      //    block a rename.
      //
      // Two denormalizations carry the subsector outside its own table: the live
      // `organization_data` rows, and the frozen `carbon_inventory.organizationData`
      // JSON snapshot (which stores `sectorId` + `subsectorId` as a point-in-time
      // pair, written as strings — see `buildOrganizationDataSnapshot`). The snapshot
      // is an independent copy, so it can reference this subsector even when no live
      // organization_data row does. A no-op (same name / same sector) never blocks;
      // re-identification is only allowed by soft-deleting (which cascades) and
      // re-creating under the correct name/sector.
      if (data.name !== undefined || data.countrySectorId !== undefined) {
        const existing = await tx.countrySubsector.findUnique({
          where: { id: subsectorId },
          select: { name: true, countrySectorId: true },
        });
        if (!existing) {
          throw new ResourceNotFoundError("CountrySubsector", id);
        }

        const isRename = data.name !== undefined && data.name !== existing.name;
        const newSectorId =
          data.countrySectorId !== undefined
            ? BigInt(data.countrySectorId)
            : null;
        const isReparent =
          newSectorId !== null && newSectorId !== existing.countrySectorId;

        if (isReparent) {
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
        }

        if (isRename || isReparent) {
          const [organizationDataCount, carbonInventoryCount] =
            await Promise.all([
              tx.organizationData.count({ where: { subsectorId } }),
              // The snapshot stores `subsectorId` as a string (see
              // `buildOrganizationDataSnapshot`), so match against the string form.
              // Only ACTIVE inventories matter — a DELETED inventory's frozen pair
              // is inert.
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

          // Catalog children only block re-parenting (renaming them is harmless).
          let activeMainActivityCount = 0;
          let activeSubcategoryRecommendationCount = 0;
          if (isReparent) {
            [activeMainActivityCount, activeSubcategoryRecommendationCount] =
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
          }

          const userDataRefs = organizationDataCount + carbonInventoryCount;
          const catalogChildRefs =
            activeMainActivityCount + activeSubcategoryRecommendationCount;
          const nameBlocked = isRename && userDataRefs > 0;
          const parentBlocked =
            isReparent && (userDataRefs > 0 || catalogChildRefs > 0);

          if (nameBlocked || parentBlocked) {
            const referencedBy: string[] = [];
            // A name-only block lists user data only; catalog children are not the
            // reason a rename is rejected.
            if (parentBlocked && activeMainActivityCount > 0)
              referencedBy.push("main activities");
            if (parentBlocked && activeSubcategoryRecommendationCount > 0)
              referencedBy.push("subcategory recommendations");
            if (organizationDataCount > 0)
              referencedBy.push("organization data");
            if (carbonInventoryCount > 0)
              referencedBy.push("carbon inventories");

            const referencedByDetail: Record<string, number> = {
              organizationData: organizationDataCount,
              carbonInventories: carbonInventoryCount,
            };
            if (parentBlocked) {
              referencedByDetail.activeMainActivities = activeMainActivityCount;
              referencedByDetail.activeSubcategoryRecommendations =
                activeSubcategoryRecommendationCount;
            }

            const error = new EditBlockedByReferencesError(
              referencedBy.join(", ")
            );
            throw attachDetails(error, {
              resourceType: "CountrySubsector",
              attemptedChange: parentBlocked ? "parent" : "name",
              referencedBy: referencedByDetail,
            });
          }
        }

        if (isReparent && newSectorId !== null) {
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
