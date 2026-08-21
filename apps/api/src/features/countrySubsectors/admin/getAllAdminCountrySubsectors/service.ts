import {
  type PrismaClient,
  CountrySubsectorStatus,
  type Prisma,
} from "@repo/database";
import type {
  GetAllAdminCountrySubsectorsQuery,
  GetAllAdminCountrySubsectorsResponse,
} from "@repo/types";
import { countOrganizationDataBySubsector } from "../../../organizations/catalogReferenceCounts.js";
import {
  adminCountrySubsectorSelect,
  mapCountrySubsectorToAdmin,
} from "../helpers.js";

export const getAllAdminCountrySubsectorsService = async (
  prismaClient: PrismaClient,
  query: GetAllAdminCountrySubsectorsQuery | null
): Promise<GetAllAdminCountrySubsectorsResponse> => {
  const status = query?.status ?? "active";
  const where: Prisma.CountrySubsectorWhereInput = {};
  if (status === "active") {
    where.status = CountrySubsectorStatus.ACTIVE;
  } else if (status === "deleted") {
    where.status = CountrySubsectorStatus.DELETED;
  }

  const rows = await prismaClient.countrySubsector.findMany({
    where,
    orderBy: { name: "asc" },
    select: adminCountrySubsectorSelect,
  });

  const organizationDataCounts = await countOrganizationDataBySubsector(
    prismaClient,
    rows.map((row) => row.id)
  );

  return rows.map((row) =>
    mapCountrySubsectorToAdmin(
      row,
      organizationDataCounts.get(row.id.toString()) ?? 0
    )
  );
};
