import { Prisma, type PrismaClient } from "@repo/database";
import {
  type CreateCarbonInventoryRequest,
  type CreateCarbonInventoryResponse,
  MethodologyVersionStatus,
  User,
} from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { NoActiveMethodologyError } from "../errors.js";
import { buildOrganizationDataSnapshot } from "./helpers.js";

export const createCarbonInventoryService = async (
  prismaClient: PrismaClient,
  data: CreateCarbonInventoryRequest,
  user?: User | null
): Promise<CreateCarbonInventoryResponse> => {
  // Find the first methodology version with status MethodologyVersionStatus.PUBLISHED
  const availableMethodology = await prismaClient.methodologyVersion.findFirst({
    where: {
      status: MethodologyVersionStatus.PUBLISHED,
    },
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
    },
  });

  if (!availableMethodology) {
    throw new NoActiveMethodologyError();
  }

  const userId = user?.id ?? null;

  // Snapshot the linked organization's canonical fields so the profiling form is
  // prefilled on first visit. The snapshot is frozen at creation time.
  const organizationDataSnapshot = data.organizationId
    ? await buildOrganizationDataSnapshot(prismaClient, data.organizationId)
    : null;

  const item = await prismaClient.carbonInventory.create({
    data: {
      usageMode: data.usageMode,
      methodologyVersionId: availableMethodology.id,
      organizationId: data.organizationId ? BigInt(data.organizationId) : null,
      createdById: userId ? BigInt(userId) : null,
      updatedAt: null,
      organizationData: organizationDataSnapshot
        ? (organizationDataSnapshot as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  return mapCarbonInventoryToResponse(item);
};
