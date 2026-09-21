import { MethodologyVersionStatus, type PrismaClient } from "@repo/database";
import type { GetCarbonInventoryMethodologyExportResponse } from "@repo/types";
import { MethodologyNotFoundError } from "@/features/methodologies/errors.js";
import { findMethodologyExportByVersionId } from "@/features/methodologies/helpers.js";
import { mapMethodologyExportToResponse } from "@/features/methodologies/mappers.js";

export const getCarbonInventoryMethodologyExportService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string
): Promise<GetCarbonInventoryMethodologyExportResponse> => {
  const inventory = await prismaClient.carbonInventory.findUniqueOrThrow({
    where: { id: BigInt(carbonInventoryId) },
    select: { methodologyVersionId: true, year: true },
  });

  // Scoped to the footprint's year, like the capture selector: a workbook
  // listing factors the footprint can never select contradicts the screen it
  // is meant to document. A footprint with no year yet keeps the whole
  // catalogue — see `buildMethodologyExportSelect`.
  const methodology = await findMethodologyExportByVersionId(
    prismaClient,
    {
      id: inventory.methodologyVersionId,
      status: {
        in: [
          MethodologyVersionStatus.PUBLISHED,
          MethodologyVersionStatus.UNPUBLISHED,
        ],
      },
    },
    inventory.year
  );

  if (!methodology) {
    throw new MethodologyNotFoundError();
  }

  return mapMethodologyExportToResponse(methodology);
};
