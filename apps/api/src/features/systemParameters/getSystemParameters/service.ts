import type { PrismaClient } from "@repo/database";
import {
  type User,
  type GetSystemParametersQuery,
  type GetSystemParametersResponse,
  SystemParameterEntrySchema,
} from "@repo/types";

export const getSystemParametersService = async (
  prismaClient: PrismaClient,
  query: GetSystemParametersQuery | null,
  _user: User | null
): Promise<GetSystemParametersResponse> => {
  const where = query?.keys ? { key: { in: query.keys } } : {};

  const parameters = await prismaClient.systemParameter.findMany({
    where,
    select: { key: true, value: true, minValue: true, maxValue: true },
    orderBy: { key: "asc" },
  });

  return parameters.map((param) => SystemParameterEntrySchema.parse(param));
};
