import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
  type Prisma,
} from "@repo/database";
import type {
  GetAllAdminCountryOrganizationSizesQuery,
  GetAllAdminCountryOrganizationSizesResponse,
} from "@repo/types";
import {
  adminCountryOrganizationSizeSelect,
  mapCountryOrganizationSizeToAdmin,
} from "../helpers.js";

export const getAllAdminCountryOrganizationSizesService = async (
  prismaClient: PrismaClient,
  query: GetAllAdminCountryOrganizationSizesQuery | null
): Promise<GetAllAdminCountryOrganizationSizesResponse> => {
  const status = query?.status ?? "active";
  const where: Prisma.CountryOrganizationSizeWhereInput = {};
  if (status === "active") {
    where.status = CountryOrganizationSizeStatus.ACTIVE;
  } else if (status === "deleted") {
    where.status = CountryOrganizationSizeStatus.DELETED;
  }

  const rows = await prismaClient.countryOrganizationSize.findMany({
    where,
    orderBy: { name: "asc" },
    select: adminCountryOrganizationSizeSelect,
  });

  return rows.map(mapCountryOrganizationSizeToAdmin);
};
