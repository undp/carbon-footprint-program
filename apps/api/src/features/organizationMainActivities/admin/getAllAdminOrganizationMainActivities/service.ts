import {
  type PrismaClient,
  OrganizationMainActivityStatus,
  type Prisma,
} from "@repo/database";
import type {
  GetAllAdminOrganizationMainActivitiesQuery,
  GetAllAdminOrganizationMainActivitiesResponse,
} from "@repo/types";
import { adminMainActivitySelect, mapMainActivityToAdmin } from "../helpers.js";

export const getAllAdminOrganizationMainActivitiesService = async (
  prismaClient: PrismaClient,
  query: GetAllAdminOrganizationMainActivitiesQuery | null
): Promise<GetAllAdminOrganizationMainActivitiesResponse> => {
  const status = query?.status ?? "active";
  const where: Prisma.OrganizationMainActivityWhereInput = {};
  if (status === "active") {
    where.status = OrganizationMainActivityStatus.ACTIVE;
  } else if (status === "deleted") {
    where.status = OrganizationMainActivityStatus.DELETED;
  }

  const rows = await prismaClient.organizationMainActivity.findMany({
    where,
    orderBy: { name: "asc" },
    select: adminMainActivitySelect,
  });

  return rows.map(mapMainActivityToAdmin);
};
