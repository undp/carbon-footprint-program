import {
  type PrismaClient,
  Prisma,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/database";
import {
  type UpdateOrganizationMainActivityRequest,
  type UpdateOrganizationMainActivityResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
  attachDetails,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import {
  countConsumerReferences,
  throwEditBlockedByConsumers,
} from "@/helpers/catalogReferenceGuard.js";
import { normalizeDescriptionInput } from "@/helpers/normalizeDescriptionInput.js";
import { SectorSubsectorMismatchError } from "../../errors.js";
import { UserNotFoundError } from "../../../users/errors.js";
import { adminMainActivitySelect, mapMainActivityToAdmin } from "../helpers.js";

export const updateOrganizationMainActivityService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateOrganizationMainActivityRequest,
  user: User | null
): Promise<UpdateOrganizationMainActivityResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const activityId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      // Scope to ACTIVE so editing a soft-deleted row surfaces as not-found
      // before the reference check, instead of a misleading 409.
      const existing = await tx.organizationMainActivity.findFirst({
        where: {
          id: activityId,
          status: OrganizationMainActivityStatus.ACTIVE,
        },
        select: {
          id: true,
          name: true,
          countrySectorId: true,
          countrySubsectorId: true,
        },
      });
      if (!existing) {
        throw new ResourceNotFoundError("OrganizationMainActivity", id);
      }

      // Compute the effective (sectorId, subsectorId) pair after applying the patch.
      const effectiveSectorId =
        data.countrySectorId !== undefined
          ? data.countrySectorId === null
            ? null
            : BigInt(data.countrySectorId)
          : existing.countrySectorId;
      const effectiveSubsectorId =
        data.countrySubsectorId !== undefined
          ? data.countrySubsectorId === null
            ? null
            : BigInt(data.countrySubsectorId)
          : existing.countrySubsectorId;

      // Validate ACTIVE parents on the values touched by the patch.
      if (data.countrySectorId !== undefined && effectiveSectorId !== null) {
        const sector = await tx.countrySector.findFirst({
          where: {
            id: effectiveSectorId,
            status: CountrySectorStatus.ACTIVE,
          },
          select: { id: true },
        });
        if (!sector) {
          throw new ResourceNotFoundError(
            "CountrySector",
            data.countrySectorId
          );
        }
      }
      let validatedSubsector: { countrySectorId: bigint } | null = null;
      if (
        data.countrySubsectorId !== undefined &&
        effectiveSubsectorId !== null
      ) {
        const subsector = await tx.countrySubsector.findFirst({
          where: {
            id: effectiveSubsectorId,
            status: CountrySubsectorStatus.ACTIVE,
          },
          select: { id: true, countrySectorId: true },
        });
        if (!subsector) {
          throw new ResourceNotFoundError(
            "CountrySubsector",
            data.countrySubsectorId
          );
        }
        validatedSubsector = { countrySectorId: subsector.countrySectorId };
      }

      // If both effective ids are present, assert the subsector belongs to the
      // effective sector. Reuse the subsector validated above when available;
      // only re-fetch when the patch did not touch countrySubsectorId (e.g. the
      // patch changed only countrySectorId).
      if (effectiveSubsectorId !== null && effectiveSectorId !== null) {
        const subsector =
          validatedSubsector ??
          (await tx.countrySubsector.findUnique({
            where: { id: effectiveSubsectorId },
            select: { countrySectorId: true },
          }));
        if (!subsector || subsector.countrySectorId !== effectiveSectorId) {
          throw new SectorSubsectorMismatchError();
        }
      }

      // Identity-changing edits to an activity already selected by a user are
      // blocked, because both denormalizations that carry `mainActivityId` resolve
      // their value by id at read time — the live `organization_data.mainActivityId`
      // rows and the frozen `carbon_inventory.organizationData` JSON snapshot (which
      // stores `mainActivityId` as a string):
      //
      //  - Re-parenting (moving the activity to a different sector/subsector pair)
      //    would silently invalidate the parent stored alongside those references.
      //  - Renaming would make those users see a name they never chose.
      //
      // An activity is a leaf (no catalog children), so both edits are guarded by the
      // same user-data reference set. A no-op patch (same name, same effective pair)
      // never blocks; re-identification is only allowed by soft-deleting and
      // re-creating the activity under the correct name/parents.
      const isRename = data.name !== undefined && data.name !== existing.name;
      const isReparent =
        (data.countrySectorId !== undefined ||
          data.countrySubsectorId !== undefined) &&
        (effectiveSectorId !== existing.countrySectorId ||
          effectiveSubsectorId !== existing.countrySubsectorId);
      if (isRename || isReparent) {
        const { organizationDataCount, carbonInventoryCount } =
          await countConsumerReferences(tx, {
            organizationDataWhere: { mainActivityId: activityId },
            snapshotJsonKey: "mainActivityId",
            id: activityId,
          });

        if (organizationDataCount > 0 || carbonInventoryCount > 0) {
          throwEditBlockedByConsumers({
            resourceType: "OrganizationMainActivity",
            attemptedChange: isReparent ? "parent" : "name",
            organizationDataCount,
            carbonInventoryCount,
          });
        }
      }

      const updateData: Prisma.OrganizationMainActivityUpdateInput = {
        updater: { connect: { id: BigInt(user.id) } },
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) {
        updateData.description = normalizeDescriptionInput(data.description);
      }
      if (data.countrySectorId !== undefined) {
        updateData.countrySector =
          data.countrySectorId === null
            ? { disconnect: true }
            : { connect: { id: BigInt(data.countrySectorId) } };
      }
      if (data.countrySubsectorId !== undefined) {
        updateData.countrySubsector =
          data.countrySubsectorId === null
            ? { disconnect: true }
            : { connect: { id: BigInt(data.countrySubsectorId) } };
      }

      const updated = await tx.organizationMainActivity.update({
        // Scope to ACTIVE so editing a soft-deleted row surfaces as not-found
        // (P2025 -> ResourceNotFoundError), matching the delete/restore flows.
        where: {
          id: activityId,
          status: OrganizationMainActivityStatus.ACTIVE,
        },
        data: updateData,
        select: adminMainActivitySelect,
      });
      return mapMainActivityToAdmin(updated);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ResourceNotFoundError("OrganizationMainActivity", id);
      }
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
            resourceType: "OrganizationMainActivity",
            context: "UPDATE",
          });
        }
      }
    }
    throw error;
  }
};
