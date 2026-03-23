import type { PrismaClient } from "@repo/database";
import type {
  GetValidFootprintYearsResponse,
  User,
} from "@repo/types";

export const getValidFootprintYearsService = async (
  prismaClient: PrismaClient,
  orgId: string,
  _user: User | null
): Promise<GetValidFootprintYearsResponse> => {
  const inventories = await prismaClient.carbonInventory.findMany({
    where: {
      organizationId: BigInt(orgId),
      status: "ACTIVE",
      year: { not: null },
    },
    select: { year: true },
    orderBy: { year: "desc" },
  });

  const years = [
    ...new Set(
      inventories
        .map((i) => i.year)
        .filter((y): y is number => y !== null)
    ),
  ];

  return years;
};
