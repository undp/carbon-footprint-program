import type { PrismaClient } from "@repo/database";
import type {
  UpdateReductionProjectBody,
  UpdateReductionProjectResponse,
  User,
} from "@repo/types";
import { mapReductionProjectWithoutFilesOrReports } from "../mappers.js";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
} from "../errors.js";

export const updateReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateReductionProjectBody,
  user: User | null
): Promise<UpdateReductionProjectResponse> => {
  const existing = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existing) {
    throw new ReductionProjectNotFoundError(id);
  }

  if (existing.status !== "DRAFT") {
    throw new InvalidStatusTransitionError(id, existing.status, "DRAFT (edit)");
  }

  const project = await prismaClient.reductionProject.update({
    where: { id: BigInt(id) },
    data: {
      ...(data.organizationBranchId !== undefined && {
        organizationBranchId: data.organizationBranchId
          ? BigInt(data.organizationBranchId)
          : null,
      }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && {
        description: data.description ?? null,
      }),
      ...(data.implementationDate !== undefined && {
        implementationDate: data.implementationDate
          ? new Date(data.implementationDate)
          : null,
      }),
      ...(data.subcategoryId !== undefined && {
        subcategoryId: data.subcategoryId
          ? BigInt(data.subcategoryId)
          : null,
      }),
      ...(data.pcg !== undefined && { pcg: data.pcg ?? null }),
      ...(data.usePcgNationalInventory !== undefined && {
        usePcgNationalInventory: data.usePcgNationalInventory,
      }),
      ...(data.selectedGases !== undefined && {
        selectedGases: data.selectedGases ?? [],
      }),
      ...(data.reportedInOtherInitiative !== undefined && {
        reportedInOtherInitiative: data.reportedInOtherInitiative,
        ...(data.reportedInOtherInitiative === false && {
          otherInitiativeDescription: null,
        }),
      }),
      ...(data.otherInitiativeDescription !== undefined && {
        otherInitiativeDescription: data.otherInitiativeDescription ?? null,
      }),
      updatedById: user ? BigInt(user.id) : null,
    },
  });

  return mapReductionProjectWithoutFilesOrReports(project);
};
