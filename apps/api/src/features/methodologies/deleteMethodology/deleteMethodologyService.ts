import { type PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/types";

type DeleteResult =
  | { success: true }
  | {
      success: false;
      error: "NOT_FOUND" | "HAS_ACTIVE_INVENTORIES" | "IS_PUBLISHED";
    };

export const deleteMethodologyService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<DeleteResult> => {
  const methodologyId = BigInt(id);

  // Check if methodology exists and is active
  const methodology = await prismaClient.methodologyVersion.findUnique({
    where: { id: methodologyId },
    include: {
      _count: {
        select: {
          carbonInventories: {
            where: {
              status: { not: "DELETED" },
            },
          },
        },
      },
    },
  });

  if (!methodology || methodology.status === MethodologyVersionStatus.DELETED) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (methodology.status === MethodologyVersionStatus.PUBLISHED) {
    return { success: false, error: "IS_PUBLISHED" };
  }

  // Check if methodology has active carbon inventories
  if (methodology._count.carbonInventories > 0) {
    return { success: false, error: "HAS_ACTIVE_INVENTORIES" };
  }

  // Soft delete by setting status to DELETED
  await prismaClient.methodologyVersion.update({
    where: { id: methodologyId },
    data: {
      status: MethodologyVersionStatus.DELETED,
      updatedById: null, // TODO: Add from authenticated user
    },
  });

  return { success: true };
};
