import type { PrismaClient } from "@repo/database";
import type {
  ReopenReductionProjectResponse,
  User,
} from "@repo/types";
import { mapReductionProjectWithoutFilesOrReports } from "../mappers.js";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
} from "../errors.js";

export const reopenReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<ReopenReductionProjectResponse> => {
  const project = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  if (project.status !== "REJECTED") {
    throw new InvalidStatusTransitionError(id, project.status, "DRAFT");
  }

  const updated = await prismaClient.reductionProject.update({
    where: { id: BigInt(id) },
    data: {
      status: "DRAFT",
      updatedById: user ? BigInt(user.id) : null,
    },
  });

  return mapReductionProjectWithoutFilesOrReports(updated);
};
