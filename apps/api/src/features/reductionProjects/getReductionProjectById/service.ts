import { type PrismaClient } from "@repo/database";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { InventoryStatus } from "@repo/types";
import { ReductionProjectNotFoundError } from "../errors.js";
import { calculateReductionProjectDisplayStatus } from "../helpers.js";
import { mapReductionProjectToGetByIdResponse } from "../mappers.js";

export const getReductionProjectByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetReductionProjectByIdResponse> => {
  const row = await prismaClient.reductionProject.findFirst({
    where: {
      id: BigInt(id),
      status: InventoryStatus.ACTIVE,
    },
    include: {
      submission: {
        include: {
          subject: {
            include: {
              submissions: {
                select: {
                  id: true,
                  status: true,
                  type: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!row) {
    throw new ReductionProjectNotFoundError(id);
  }

  return mapReductionProjectToGetByIdResponse(
    row,
    calculateReductionProjectDisplayStatus(row)
  );
};
