import {
  MembershipStatus,
  OrganizationStatus,
  SubmissionStatus,
  SubmissionType,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import type { OrganizationRole } from "@repo/database/enums";
import {
  InventoryStatus,
  ReductionProjectStatus,
  ReductionProjectDisplayStatusEnum,
  type ReductionProjectDisplayStatus,
} from "@repo/types";
import { ReductionProjectInvalidDataError } from "./errors.js";

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
  if (project.status === ReductionProjectStatus.DELETED) {
    return ReductionProjectDisplayStatusEnum.DELETED;
  }

  const submissions = project.submission?.subject.submissions ?? [];
  const verifSubs = submissions.filter(
    (s) => s.type === SubmissionType.REDUCTION_PROJECT_VERIFICATION
  );

  if (!verifSubs.length) {
    return ReductionProjectDisplayStatusEnum.DRAFT;
  }

  if (verifSubs.some((s) => s.status === SubmissionStatus.APPROVED)) {
    return ReductionProjectDisplayStatusEnum.APPROVED;
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

/**
 * Validates in a single query that:
 * - The carbon inventory exists and is ACTIVE
 * - The CI belongs to the specified organization
 * - The organization is ACTIVE and accredited
 * - The authenticated user is an active org member with one of the allowed roles
 * - The CI has at least one approved CARBON_INVENTORY_VERIFICATION submission
 *
 * Throws a generic 422 if any condition fails (no detail exposed to prevent ID enumeration).
 */
export async function validateReductionProjectPrerequisites(
  tx: PrismaClient | Prisma.TransactionClient,
  organizationId: string,
  carbonInventoryId: string,
  userId: bigint | null,
  allowedRoles: OrganizationRole[]
): Promise<void> {
  if (userId === null) {
    throw new ReductionProjectInvalidDataError();
  }

  const valid = await tx.carbonInventory.findFirst({
    where: {
      id: BigInt(carbonInventoryId),
      status: InventoryStatus.ACTIVE,
      organizationId: BigInt(organizationId),
      organization: {
        status: OrganizationStatus.ACTIVE,
        summary: { isAccredited: true },
        memberships: {
          some: {
            userId,
            status: MembershipStatus.ACTIVE,
            role: { in: allowedRoles },
          },
        },
      },
      submission: {
        subject: {
          submissions: {
            some: {
              type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
              status: SubmissionStatus.APPROVED,
            },
          },
        },
      },
    },
    select: { id: true },
  });

  if (!valid) {
    throw new ReductionProjectInvalidDataError();
  }
}
