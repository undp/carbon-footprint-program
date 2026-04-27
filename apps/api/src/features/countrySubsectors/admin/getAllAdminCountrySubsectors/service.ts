import {
  type PrismaClient,
  CountrySubsectorStatus,
  type Prisma,
} from "@repo/database";
import type {
  GetAllAdminCountrySubsectorsQuery,
  GetAllAdminCountrySubsectorsResponse,
} from "@repo/types";
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

  return rows.map(mapCountrySubsectorToAdmin);
};
