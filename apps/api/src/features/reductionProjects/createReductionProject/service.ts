import type { PrismaClient } from "@repo/database";
import type {
  CreateReductionProjectBody,
  CreateReductionProjectResponse,
  User,
} from "@repo/types";
import { mapReductionProjectWithoutFilesOrReports } from "../mappers.js";

export const createReductionProjectService = async (
  prismaClient: PrismaClient,
  data: CreateReductionProjectBody,
  user: User | null
): Promise<CreateReductionProjectResponse> => {
  const project = await prismaClient.reductionProject.create({
    data: {
      organizationId: BigInt(data.organizationId),
      organizationBranchId: data.organizationBranchId
        ? BigInt(data.organizationBranchId)
        : null,
      name: data.name,
      description: data.description ?? null,
      implementationDate: data.implementationDate
        ? new Date(data.implementationDate)
        : null,
      subcategoryId: data.subcategoryId ? BigInt(data.subcategoryId) : null,
      pcg: data.pcg ?? null,
      usePcgNationalInventory: data.usePcgNationalInventory ?? false,
      selectedGases: data.selectedGases ?? [],
      reportedInOtherInitiative: data.reportedInOtherInitiative ?? false,
      otherInitiativeDescription: data.otherInitiativeDescription ?? null,
      createdById: user ? BigInt(user.id) : null,
    },
  });

  return mapReductionProjectWithoutFilesOrReports(project);
};
