import {
  SubmissionStatus,
  SubmissionType,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import {
  InventoryStatus,
  ReductionProjectDisplayStatusEnum,
  type ReductionProjectDisplayStatus,
} from "@repo/types";

export const reductionProjectWithSubmissionsMinimalSelect = {
  id: true,
  status: true,
  submission: {
    select: {
      subject: {
        select: {
          submissions: {
            select: {
              id: true,
              status: true,
              type: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ReductionProjectSelect;

export type ReductionProjectWithSubmissionsMinimal =
  Prisma.ReductionProjectGetPayload<{
    select: typeof reductionProjectWithSubmissionsMinimalSelect;
  }>;

export function calculateReductionProjectDisplayStatus(
  project: ReductionProjectWithSubmissionsMinimal
): ReductionProjectDisplayStatus {
  if (project.status === InventoryStatus.DELETED) {
    return ReductionProjectDisplayStatusEnum.DELETED;
  }

  const submissions = project.submission?.subject.submissions ?? [];
  const verifSubs = submissions.filter(
    (s) => s.type === SubmissionType.REDUCTION_PROJECT_VERIFICATION
  );

  if (!verifSubs.length) {
    return ReductionProjectDisplayStatusEnum.DRAFT;
  }

  if (verifSubs.some((s) => s.status === SubmissionStatus.PENDING)) {
    return ReductionProjectDisplayStatusEnum.SUBMITTED;
  }

  if (verifSubs.some((s) => s.status === SubmissionStatus.REVIEWED)) {
    return ReductionProjectDisplayStatusEnum.REVIEWED;
  }

  if (verifSubs.some((s) => s.status === SubmissionStatus.REJECTED)) {
    return ReductionProjectDisplayStatusEnum.REJECTED;
  }

  if (verifSubs.some((s) => s.status === SubmissionStatus.APPROVED)) {
    return ReductionProjectDisplayStatusEnum.APPROVED;
  }

  return ReductionProjectDisplayStatusEnum.DRAFT;
}

export const reductionProjectSubmissionFilter: Prisma.ReductionProjectWhereInput =
  {
    OR: [
      { submission: { is: null } },
      {
        submission: {
          subject: {
            submissions: {
              some: {
                type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
              },
            },
          },
        },
      },
    ],
  };

export async function createReductionProjectSubmission(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  reductionProjectId: bigint,
  type: SubmissionType,
  createdById: bigint | null
): Promise<bigint> {
  const existingSubject =
    await prismaClient.submissionSubjectReductionProject.findUnique({
      where: { reductionProjectId },
      select: { subjectId: true },
    });

  if (existingSubject) {
    const submission = await prismaClient.submission.create({
      data: {
        subjectId: existingSubject.subjectId,
        type,
        createdById,
        updatedAt: null,
      },
    });
    return submission.id;
  }

  const subject = await prismaClient.submissionSubject.create({
    data: {
      createdById,
      submissions: {
        create: {
          type,
          createdById,
          updatedAt: null,
        },
      },
      reductionProject: {
        create: {
          reductionProjectId,
        },
      },
    },
    include: { submissions: { select: { id: true }, take: 1 } },
  });
  return subject.submissions[0].id;
}
