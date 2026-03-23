import type { PrismaClient } from "@repo/database";
import type {
  GetReductionProjectByIdResponse,
  User,
} from "@repo/types";
import { mapReductionProjectToResponse } from "../mappers.js";
import { ReductionProjectNotFoundError } from "../errors.js";

export const getReductionProjectByIdService = async (
  prismaClient: PrismaClient,
  id: string,
  _user: User | null
): Promise<GetReductionProjectByIdResponse> => {
  const project = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
    include: { files: true, reports: true },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  return mapReductionProjectToResponse(project);
};
