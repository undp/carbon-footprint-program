import {
  type PrismaClient,
  CountrySectorStatus,
  type Prisma,
} from "@repo/database";
import type {
  GetAllAdminCountrySectorsQuery,
  GetAllAdminCountrySectorsResponse,
} from "@repo/types";
import { countOrganizationDataBySector } from "../../../organizations/catalogReferenceCounts.js";
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

  const organizationDataCounts = await countOrganizationDataBySector(
    prismaClient,
    rows.map((row) => row.id)
  );

  return rows.map((row) =>
    mapCountrySectorToAdmin(
      row,
      organizationDataCounts.get(row.id.toString()) ?? 0
    )
  );
};
