import { type PrismaClient, MagnitudeStatus } from "@repo/database";
import type { GetAllMagnitudesResponse } from "@repo/types";
import { mapMagnitudeWithReferenceCount } from "../mappers.js";

export const getAllMagnitudesService = async (
  prismaClient: PrismaClient
): Promise<GetAllMagnitudesResponse> => {
  const [magnitudes, referenceCounts] = await Promise.all([
    prismaClient.magnitude.findMany({
      where: { status: MagnitudeStatus.ACTIVE },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prismaClient.measurementUnit.groupBy({
      by: ["magnitudeId"],
      _count: { _all: true },
    }),
  ]);

  const referenceCountByMagnitudeId = new Map(
    referenceCounts.map((row) => [row.magnitudeId.toString(), row._count._all])
  );

  return magnitudes.map((magnitude) =>
    mapMagnitudeWithReferenceCount(
      magnitude,
      referenceCountByMagnitudeId.get(magnitude.id.toString()) ?? 0
    )
  );
};
