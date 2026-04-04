import { type PrismaClient } from "@repo/database";
import type {
  CreateReductionProjectRequest,
  CreateReductionProjectResponse,
  User,
} from "@repo/types";

export const createReductionProjectService = async (
  prismaClient: PrismaClient,
  _data: CreateReductionProjectRequest,
  user?: User | null
): Promise<CreateReductionProjectResponse> => {
  const userId = user?.id ? BigInt(user.id) : null;

  const item = await prismaClient.reductionProject.create({
    data: {
      createdById: userId,
      updatedAt: null,
    },
  });

  return { id: item.id.toString() };
};
