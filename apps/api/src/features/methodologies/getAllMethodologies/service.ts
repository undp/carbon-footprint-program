import type { PrismaClient } from "@repo/database";
import type { GetAllMethodologiesResponse } from "@repo/types";
import { MethodologyVersionStatus } from "@repo/types";
import { mapMethodologyWithRelationsToResponse } from "../mappers.js";

export const getAllMethodologiesService = async (
  prismaClient: PrismaClient
): Promise<GetAllMethodologiesResponse> => {
  const methodologies = await prismaClient.methodologyVersion.findMany({
    where: {
      status: {
        not: MethodologyVersionStatus.DELETED,
      },
    },
    include: {
      country: true,
      _count: {
        select: {
          categories: true,
          carbonInventories: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return methodologies.map(mapMethodologyWithRelationsToResponse);
};
