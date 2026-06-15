import { Prisma, type PrismaClient } from "@repo/database";
import type {
  UpdateReductionProjectRequest,
  UpdateReductionProjectResponse,
  User,
} from "@repo/types";
import { mapBigIntField } from "@/utils/bigint.js";
import {
  ReductionProjectNotFoundError,
  ReductionProjectNotUpdatableError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  reductionProjectWithSubmissionsMinimalSelect,
  validateReductionProjectReferences,
} from "../helpers.js";
import { ReductionProjectStatus } from "@repo/types";
import { isReductionProjectEditable } from "@repo/utils";

export const updateReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateReductionProjectRequest,
  user: User | null
): Promise<UpdateReductionProjectResponse> => {
  const userId = user?.id ? BigInt(user.id) : null;

  await prismaClient.$transaction(async (tx) => {
    // DRAFT-first: only a light referential check on update. Update writes
    // fields only — it never (re)creates a submission. Resubmitting after a
    // REVIEWED is a separate, deliberate "request verification" action.
    await validateReductionProjectReferences(
      tx,
      data.organizationId,
      data.carbonInventoryId
    );

    const existing = await tx.reductionProject.findUnique({
      where: { id: BigInt(id), status: ReductionProjectStatus.ACTIVE },
      select: { ...reductionProjectWithSubmissionsMinimalSelect },
    });

    if (!existing) {
      throw new ReductionProjectNotFoundError(id);
    }

    const displayStatus = calculateReductionProjectDisplayStatus(existing);

    // Editable while DRAFT or REVIEWED (mirrors carbon inventory).
    if (!isReductionProjectEditable(displayStatus)) {
      throw new ReductionProjectNotUpdatableError(id, displayStatus);
    }

    const updateData: Prisma.ReductionProjectUncheckedUpdateInput = {
      updatedById: userId,
      name: data.name,
      organizationId: mapBigIntField(data.organizationId),
      carbonInventoryId: mapBigIntField(data.carbonInventoryId),
      subcategoryId: mapBigIntField(data.subcategoryId),
    };

    if (data.implementationDate !== undefined) {
      updateData.implementationDate = data.implementationDate;
    }
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.gwpUsed !== undefined) updateData.gwpUsed = data.gwpUsed;
    if (data.consideredGei !== undefined)
      updateData.consideredGei = data.consideredGei;
    if (data.reportedElsewhere !== undefined)
      updateData.reportedElsewhere = data.reportedElsewhere;
    if (data.reportedElsewhereDescription !== undefined) {
      updateData.reportedElsewhereDescription =
        data.reportedElsewhereDescription;
    }
    if (data.year !== undefined) updateData.year = data.year;
    if (data.baselineScenario !== undefined)
      updateData.baselineScenario = data.baselineScenario;
    if (data.projectScenario !== undefined)
      updateData.projectScenario = data.projectScenario;

    await tx.reductionProject.update({
      where: { id: BigInt(id) },
      data: updateData,
    });
  });

  return {};
};
