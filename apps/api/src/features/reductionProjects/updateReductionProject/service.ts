import { type PrismaClient, OrganizationStatus } from "@repo/database";
import { MembershipStatus } from "@repo/database/enums";
import {
  InventoryStatus,
  type UpdateReductionProjectRequest,
  type UpdateReductionProjectResponse,
  type User,
} from "@repo/types";
import { isReductionProjectEditable } from "@repo/utils";
import { mapBigIntField } from "@/utils/bigint.js";
import {
  ReductionProjectInvalidDataError,
  ReductionProjectNotFoundError,
  ReductionProjectNotUpdatableError,
  ReductionProjectOrganizationForbiddenError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  reductionProjectWithSubmissionsMinimalSelect,
  REDUCTION_PROJECT_EDIT_ROLES,
} from "../helpers.js";

/**
 * Field-only update for DRAFT and REVIEWED projects. Never creates a
 * submission or attaches files — those go through `request-verification`.
 *
 * Authorization is two-sided: the route resolves the current (source) org from
 * `:id`; when the edit re-parents the project, the service additionally
 * requires CONTRIBUTOR/ADMIN membership in an ACTIVE destination org. When the
 * org or the linked inventory changes, the new inventory must be an ACTIVE
 * inventory of the effective org (ownership guard) — prevents attaching another
 * org's inventory.
 *
 * The read, the checks, and the write run in one transaction so a concurrent
 * submission or delete can't slip between the editability check and the write.
 */
export const updateReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateReductionProjectRequest,
  user: User | null
): Promise<UpdateReductionProjectResponse> => {
  const userId = user ? BigInt(user.id) : null;

  await prismaClient.$transaction(async (tx) => {
    const existing = await tx.reductionProject.findUnique({
      where: { id: BigInt(id) },
      select: {
        ...reductionProjectWithSubmissionsMinimalSelect,
        organizationId: true,
        carbonInventoryId: true,
      },
    });

    if (!existing) {
      throw new ReductionProjectNotFoundError(id);
    }

    const displayStatus = calculateReductionProjectDisplayStatus(existing);
    if (!isReductionProjectEditable(displayStatus)) {
      throw new ReductionProjectNotUpdatableError(id, displayStatus);
    }

    const newOrganizationId = mapBigIntField(data.organizationId);
    const newCarbonInventoryId = mapBigIntField(data.carbonInventoryId);
    const orgChanged = newOrganizationId !== existing.organizationId;
    const carbonInventoryChanged =
      newCarbonInventoryId !== existing.carbonInventoryId;

    // Re-parenting: the caller must be a CONTRIBUTOR/ADMIN of an ACTIVE
    // destination org.
    if (orgChanged) {
      const membership = userId
        ? await tx.userOrganizationMembership.findFirst({
            where: {
              userId,
              organizationId: newOrganizationId,
              status: MembershipStatus.ACTIVE,
              role: { in: REDUCTION_PROJECT_EDIT_ROLES },
              organization: { status: OrganizationStatus.ACTIVE },
            },
            select: { id: true },
          })
        : null;

      if (!membership) {
        throw new ReductionProjectOrganizationForbiddenError(
          data.organizationId
        );
      }
    }

    // Ownership guard only when the org/inventory pairing actually changes —
    // re-validating an unchanged pair is redundant (it was validated at create)
    // and would needlessly block edits to a draft whose inventory later became
    // non-ACTIVE. The linked inventory must be an ACTIVE inventory of the
    // effective org (prevents attaching another org's inventory).
    if (orgChanged || carbonInventoryChanged) {
      const inventory = await tx.carbonInventory.findFirst({
        where: {
          id: newCarbonInventoryId,
          status: InventoryStatus.ACTIVE,
          organizationId: newOrganizationId,
        },
        select: { id: true },
      });

      if (!inventory) {
        throw new ReductionProjectInvalidDataError();
      }
    }

    await tx.reductionProject.update({
      where: { id: BigInt(id) },
      data: {
        updatedById: userId,
        name: data.name,
        organizationId: newOrganizationId,
        carbonInventoryId: newCarbonInventoryId,
        implementationDate: data.implementationDate,
        description: data.description,
        subcategoryId: mapBigIntField(data.subcategoryId),
        gwpUsed: data.gwpUsed,
        consideredGei: data.consideredGei,
        reportedElsewhere: data.reportedElsewhere,
        reportedElsewhereDescription: data.reportedElsewhereDescription,
        year: data.year,
        baselineScenario: data.baselineScenario,
        projectScenario: data.projectScenario,
      },
    });
  });

  return null;
};
