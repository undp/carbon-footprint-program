import { MethodologyVersionStatus, type PrismaClient } from "@repo/database";
import type { GetMethodologyExportResponse } from "@repo/types";
import { MethodologyNotFoundError } from "../errors.js";
import { findMethodologyExportByVersionId } from "../helpers.js";
import { mapMethodologyExportToResponse } from "../mappers.js";

export const getMethodologyExportService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetMethodologyExportResponse> => {
  const methodology = await findMethodologyExportByVersionId(prismaClient, {
    id: BigInt(id),
    status: {
      in: [
        MethodologyVersionStatus.PUBLISHED,
        MethodologyVersionStatus.UNPUBLISHED,
      ],
    },
  });

  if (!methodology) {
    throw new MethodologyNotFoundError();
  }

  return mapMethodologyExportToResponse(methodology);
};
