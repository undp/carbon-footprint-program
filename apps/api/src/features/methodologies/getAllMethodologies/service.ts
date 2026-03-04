import { InventoryStatus, type PrismaClient } from "@repo/database";
import {
  type GetAllMethodologiesResponse,
  MethodologyVersionStatus,
} from "@repo/types";
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
          carbonInventories: {
            where: {
              status: InventoryStatus.ACTIVE,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return methodologies.map(mapMethodologyWithRelationsToResponse);
};
