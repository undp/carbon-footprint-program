import { type PrismaClient } from "@repo/database";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { ReductionProjectStatus } from "@repo/types";
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
      status: ReductionProjectStatus.ACTIVE,
    },
    include: {
      subcategory: { select: { id: true, name: true } },
      organization: {
        select: {
          id: true,
          summary: { select: { name: true } },
        },
      },
      carbonInventory: {
        select: { id: true, name: true, year: true },
      },
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

  const displayStatus = calculateReductionProjectDisplayStatus(row);

  return mapReductionProjectToGetByIdResponse(row, displayStatus);
};
