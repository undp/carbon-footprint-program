import type { PrismaClient } from "@repo/database";
import type {
  User,
  GetSystemParametersQuery,
  GetSystemParametersResponse,
} from "@repo/types";

export const getSystemParametersService = async (
  prismaClient: PrismaClient,
  query: GetSystemParametersQuery | null,
  _user: User | null
): Promise<GetSystemParametersResponse> => {
  const where = query?.keys
    ? { key: { in: query.keys.split(",").map((k) => k.trim()) } }
    : {};

  const parameters = await prismaClient.systemParameter.findMany({
    where,
    select: { key: true, value: true },
    orderBy: { key: "asc" },
  });

  return parameters;
};
