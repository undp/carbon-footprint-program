import type { PrismaClient } from "@repo/database";
import type { GetAllAdminRequestsResponse } from "@repo/types";

export const getAllRequestsService = async (
  prismaClient: PrismaClient
): Promise<GetAllAdminRequestsResponse> => {
  const submissions = await prismaClient.submission.findMany({
    include: {
      subject: {
        include: {
          organizationData: {
            include: {
              organizationData: {
                include: {
                  organization: {
                    include: { summary: true },
                  },
                },
              },
            },
          },
          carbonInventory: {
            include: {
              carbonInventory: {
                include: {
                  organization: {
                    include: { summary: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return submissions.map((submission) => {
    const { subject } = submission;

    let organizationName = "";
    let year = new Date().getFullYear();

    if (subject.organizationData) {
      const org = subject.organizationData.organizationData.organization;
      organizationName = org.summary?.name ?? "";
      year = subject.organizationData.organizationData.createdAt.getFullYear();
    } else if (subject.carbonInventory) {
      const inventory = subject.carbonInventory.carbonInventory;
      organizationName = inventory.organization?.summary?.name ?? "";
      year = inventory.year ?? submission.createdAt.getFullYear();
    }

    return {
      id: submission.id.toString(),
      organizationName,
      type: subject.subjectType,
      year,
      status: submission.status,
      requestedAt: submission.createdAt.toISOString(),
    };
  });
};
