import {
  type PrismaClient,
  MagnitudeStatus,
  MeasurementUnitStatus,
} from "@repo/database";
import type { GetAllMagnitudesResponse } from "@repo/types";
import { mapMagnitudeWithReferenceCount } from "../mappers.js";
import { compareMagnitudesForDisplay } from "./helpers.js";

export const getAllMagnitudesService = async (
  prismaClient: PrismaClient
): Promise<GetAllMagnitudesResponse> => {
  const [magnitudes, referenceCounts] = await Promise.all([
    prismaClient.magnitude.findMany({
      where: { status: MagnitudeStatus.ACTIVE },
    }),
    prismaClient.measurementUnit.groupBy({
      by: ["magnitudeId"],
      where: { status: MeasurementUnitStatus.ACTIVE },
      _count: { _all: true },
    }),
  ]);

  const referenceCountByMagnitudeId = new Map(
    referenceCounts.map((row) => [row.magnitudeId.toString(), row._count._all])
  );

  return magnitudes
    .map((magnitude) =>
      mapMagnitudeWithReferenceCount(
        magnitude,
        referenceCountByMagnitudeId.get(magnitude.id.toString()) ?? 0
      )
    )
    .sort(compareMagnitudesForDisplay);
};
