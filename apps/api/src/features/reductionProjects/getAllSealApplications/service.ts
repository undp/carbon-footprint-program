import type { PrismaClient } from "@repo/database";
import type {
  GetAllSealApplicationsQuery,
  GetAllSealApplicationsResponse,
  User,
} from "@repo/types";

export const getAllSealApplicationsService = async (
  prismaClient: PrismaClient,
  query: GetAllSealApplicationsQuery | null,
  _user: User | null
): Promise<GetAllSealApplicationsResponse> => {
  const submissions = await prismaClient.submission.findMany({
    where: {
      subject: {
        reductionProject: {
          is: query?.organizationId
            ? { reductionProject: { organizationId: BigInt(query.organizationId) } }
            : {},
        },
      },
    },
    include: {
      subject: {
        include: {
          reductionProject: {
            include: {
              reductionProject: {
                include: { reports: { orderBy: { reductionYear: "asc" } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return submissions
    .filter((s) => s.subject.reductionProject?.reductionProject)
    .map((submission) => {
      const project = submission.subject.reductionProject!.reductionProject;
      const firstReport = project.reports[0] ?? null;
      return {
        id: submission.id.toString(),
        reductionProjectId: project.id.toString(),
        projectName: project.name,
        reductionYear: firstReport?.reductionYear ?? null,
        reductionValue: firstReport ? Number(firstReport.reductionValue) : null,
        status: project.status,
        submittedAt: submission.createdAt.toISOString(),
        reviewComments: submission.reviewComments ?? null,
      };
    });
};
