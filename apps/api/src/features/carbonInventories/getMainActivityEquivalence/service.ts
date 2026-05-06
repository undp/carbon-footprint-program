import type { PrismaClient } from "@repo/database";
import type { GetMainActivityEquivalenceResponse } from "@repo/types";
import { safeParseCarbonInventoryOrganizationData } from "../utils.js";
import { fetchInventory, fetchCategoryData } from "../helpers.js";

export const getMainActivityEquivalenceService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetMainActivityEquivalenceResponse> => {
  const inventory = await fetchInventory(prismaClient, id);
  const { totalEmissions } = await fetchCategoryData(prismaClient, inventory);

  const orgData = safeParseCarbonInventoryOrganizationData(
    id,
    inventory.organizationData
  );
  const mainActivityQuantity = orgData?.mainActivityQuantity ?? null;
  const mainActivityId = orgData?.mainActivityId ?? null;

  if (
    !mainActivityQuantity ||
    mainActivityQuantity <= 0 ||
    !mainActivityId ||
    !/^\d+$/.test(mainActivityId)
  ) {
    return null;
  }

  const mainActivity = await prismaClient.organizationMainActivity.findUnique({
    where: { id: BigInt(mainActivityId) },
    select: { name: true },
  });

  const rate = totalEmissions / mainActivityQuantity;

  return {
    rate,
    activityName: mainActivity?.name ?? "actividad principal",
  };
};
