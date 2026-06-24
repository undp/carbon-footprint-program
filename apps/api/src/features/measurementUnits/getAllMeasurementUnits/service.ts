import { type PrismaClient, MeasurementUnitStatus } from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";
import { mapMeasurementUnitToResponse } from "../mappers.js";
import { getReferenceCountsByMeasurementUnit } from "../helpers.js";
import { compareMeasurementUnitsForDisplay } from "./helpers.js";

export const getAllMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllMeasurementUnitsResponse> => {
  const measurementUnits = await prismaClient.measurementUnit.findMany({
    where: { status: MeasurementUnitStatus.ACTIVE },
    include: { magnitude: true },
  });

  if (measurementUnits.length === 0) return [];

  // Reference counts come from the shared helper so this list and the
  // create/update guards always agree on what "in use" means.
  const referenceCountByMuId = await getReferenceCountsByMeasurementUnit(
    prismaClient,
    measurementUnits.map((mu) => mu.id)
  );

  return measurementUnits
    .map((mu) =>
      mapMeasurementUnitToResponse(
        mu,
        referenceCountByMuId.get(mu.id.toString()) ?? 0
      )
    )
    .sort(compareMeasurementUnitsForDisplay);
};
