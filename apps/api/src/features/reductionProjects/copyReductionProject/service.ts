import type { PrismaClient } from "@repo/database";
import type { CopyReductionProjectResponse, User } from "@repo/types";
import { mapReductionProjectToResponse } from "../mappers.js";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
} from "../errors.js";

export const copyReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<CopyReductionProjectResponse> => {
  const original = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
    include: { reports: true, files: true },
  });

  if (!original) {
    throw new ReductionProjectNotFoundError(id);
  }

  if (original.status !== "APPROVED") {
    throw new InvalidStatusTransitionError(id, original.status, "COPY");
  }

  const userId = user ? BigInt(user.id) : null;

  const copy = await prismaClient.$transaction(async (tx) => {
    const newProject = await tx.reductionProject.create({
      data: {
        organizationId: original.organizationId,
        organizationBranchId: original.organizationBranchId,
        name: `${original.name} (copia)`,
        description: original.description,
        implementationDate: original.implementationDate,
        subcategoryId: original.subcategoryId,
        pcg: original.pcg,
        usePcgNationalInventory: original.usePcgNationalInventory,
        selectedGases: original.selectedGases,
        reportedInOtherInitiative: original.reportedInOtherInitiative,
        otherInitiativeDescription: original.otherInitiativeDescription,
        status: "DRAFT",
        createdById: userId,
      },
    });

    await tx.reductionProjectReport.createMany({
      data: original.reports.map((r) => ({
        reductionProjectId: newProject.id,
        reductionYear: r.reductionYear,
        baselineValue: r.baselineValue,
        projectValue: r.projectValue,
        reductionValue: r.reductionValue,
        createdById: userId,
      })),
    });

    return tx.reductionProject.findUniqueOrThrow({
      where: { id: newProject.id },
      include: { reports: true, files: true },
    });
  });

  return mapReductionProjectToResponse(copy);
};
