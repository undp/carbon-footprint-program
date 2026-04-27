import type { PrismaClient } from "@repo/database";
import type { GetUserRoleHistoryResponse } from "@repo/types";
import { UserNotFoundError } from "../errors.js";

export const getUserRoleHistoryService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetUserRoleHistoryResponse> => {
  const user = await prismaClient.user.findUnique({
    where: { id: BigInt(id) },
    select: { id: true },
  });

  if (!user) {
    throw new UserNotFoundError(id);
  }

  const rows = await prismaClient.userRoleAudit.findMany({
    where: { userId: BigInt(id) },
    orderBy: { createdAt: "desc" },
    include: {
      changedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id.toString(),
    userId: row.userId.toString(),
    previousRole: row.previousRole,
    newRole: row.newRole,
    changedById: row.changedById.toString(),
    createdAt: row.createdAt.toISOString(),
    changedBy: {
      id: row.changedBy.id.toString(),
      firstName: row.changedBy.firstName,
      lastName: row.changedBy.lastName,
      email: row.changedBy.email,
    },
  }));
};
