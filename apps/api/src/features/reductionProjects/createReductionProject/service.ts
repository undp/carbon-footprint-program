import { type PrismaClient } from "@repo/database";
import {
  InventoryStatus,
  type CreateReductionProjectRequest,
  type CreateReductionProjectResponse,
  type User,
} from "@repo/types";
import { mapBigIntField } from "@/utils/bigint.js";
import { ReductionProjectInvalidDataError } from "../errors.js";

/**
 * Saves a reduction project as a DRAFT. `name` + organization + carbon
 * inventory are required; every other field is persisted as sent (null when the
 * form left it blank), so one save keeps a full or partial draft. No
 * prerequisite checks, no submission, no files — those gate at
 * `request-verification`.
 */
export const createReductionProjectService = async (
  prismaClient: PrismaClient,
  data: CreateReductionProjectRequest,
  user: User | null
): Promise<CreateReductionProjectResponse> => {
  const createdById = user ? BigInt(user.id) : null;
  const organizationId = mapBigIntField(data.organizationId);
  const carbonInventoryId = mapBigIntField(data.carbonInventoryId);

  // Ownership guard + insert run in one transaction so a concurrent inventory
  // soft-delete can't slip between the check and the write. The linked inventory
  // must be an ACTIVE inventory of this org (prevents attaching another org's
  // inventory and reading its name back); verified/completeness checks stay
  // deferred to request-verification.
  const project = await prismaClient.$transaction(async (tx) => {
    const inventory = await tx.carbonInventory.findFirst({
      where: {
        id: carbonInventoryId,
        status: InventoryStatus.ACTIVE,
        organizationId,
      },
      select: { id: true },
    });

    if (!inventory) {
      throw new ReductionProjectInvalidDataError();
    }

    return tx.reductionProject.create({
      data: {
        name: data.name,
        organizationId,
        carbonInventoryId,
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
        createdById,
        updatedAt: null,
      },
    });
  });

  return { id: project.id.toString() };
};
