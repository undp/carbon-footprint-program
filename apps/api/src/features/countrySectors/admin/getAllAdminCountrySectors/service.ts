import {
  type PrismaClient,
  CountrySectorStatus,
  type Prisma,
} from "@repo/database";
import type {
  GetAllAdminCountrySectorsQuery,
  GetAllAdminCountrySectorsResponse,
} from "@repo/types";
import {
  adminCountrySectorSelect,
  mapCountrySectorToAdmin,
} from "../helpers.js";

export const getAllAdminCountrySectorsService = async (
  prismaClient: PrismaClient,
  query: GetAllAdminCountrySectorsQuery | null
): Promise<GetAllAdminCountrySectorsResponse> => {
  const status = query?.status ?? "active";
  const where: Prisma.CountrySectorWhereInput = {};
  if (status === "active") {
    where.status = CountrySectorStatus.ACTIVE;
  } else if (status === "deleted") {
    where.status = CountrySectorStatus.DELETED;
  }

  const rows = await prismaClient.countrySector.findMany({
    where,
    orderBy: { name: "asc" },
    select: adminCountrySectorSelect,
  });

  return rows.map(mapCountrySectorToAdmin);
};
