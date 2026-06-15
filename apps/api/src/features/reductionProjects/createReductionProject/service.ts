import { type PrismaClient } from "@repo/database";
import type {
  CreateReductionProjectRequest,
  CreateReductionProjectResponse,
  User,
} from "@repo/types";
import { mapBigIntField } from "@/utils/bigint.js";
import { validateReductionProjectReferences } from "../helpers.js";

export const createReductionProjectService = async (
  prismaClient: PrismaClient,
  data: CreateReductionProjectRequest,
  user: User | null
): Promise<CreateReductionProjectResponse> => {
  const createdById = user?.id ? BigInt(user.id) : null;

  const project = await prismaClient.$transaction(async (tx) => {
    // DRAFT-first: only a light referential check on create. Accreditation and
    // the CI's approved-verification submission are enforced later, at submit.
    await validateReductionProjectReferences(
      tx,
      data.organizationId,
      data.carbonInventoryId
    );

    // Create the reduction project as a DRAFT (no submission, no files).
    return tx.reductionProject.create({
      data: {
        name: data.name,
        organizationId: mapBigIntField(data.organizationId),
        carbonInventoryId: mapBigIntField(data.carbonInventoryId),
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
      select: { id: true },
    });
  });

  return { id: project.id.toString() };
};
