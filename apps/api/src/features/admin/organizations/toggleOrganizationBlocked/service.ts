import { type PrismaClient } from "@repo/database";
import type { ToggleOrganizationBlockedResponse } from "@repo/types";
import { OrganizationNotFoundError } from "../shared/errors.js";

export const toggleOrganizationBlockedService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<ToggleOrganizationBlockedResponse> => {
  const organizationId = BigInt(id);

  const organization = await prismaClient.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(id);
  }

  const previousStatus = organization.status;

  if (previousStatus !== "BLOCKED") {
    const updated = await prismaClient.organization.update({
      where: { id: organizationId },
      data: { status: "BLOCKED" },
    });

    return {
      id: updated.id.toString(),
      status: updated.status,
      previousStatus,
    };
  }

  // Organization is currently BLOCKED — determine the correct unblocked status
  const approvedOrganizationData =
    await prismaClient.organizationData.findFirst({
      where: {
        organizationId,
        status: "COMPLETED",
        submission: {
          subject: {
            submissions: {
              some: {
                status: "APPROVED",
              },
            },
          },
        },
      },
    });

  const newStatus = approvedOrganizationData ? "ACCREDITED" : "NOT_ACCREDITED";

  const updated = await prismaClient.organization.update({
    where: { id: organizationId },
    data: { status: newStatus },
  });

  return {
    id: updated.id.toString(),
    status: updated.status,
    previousStatus: "BLOCKED",
  };
};
