import {
  MembershipStatus,
  OrganizationStatus,
  SubmissionStatus,
  SubmissionType,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import type { BodyOrganizationIdExtractor } from "@/plugins/app/organizationAuthorizationPlugin.js";
import {
  InventoryStatus,
  ReductionProjectStatus,
  ReductionProjectDisplayStatusEnum,
  type ReductionProjectDisplayStatus,
} from "@repo/types";
import { isReductionProjectEditable } from "@repo/utils";
import { ReductionProjectInvalidDataError } from "./errors.js";

export const REDUCTION_PROJECT_EDIT_ROLES: OrganizationRole[] = [
  OrganizationRole.CONTRIBUTOR,
  OrganizationRole.ADMIN,
];

/**
 * Resolves whether the current request can edit a reduction project.
 * Assumes the caller already passed `requireReductionProjectAccess`.
 *
 * Edit rights require an active membership in the project's organization
 * with role CONTRIBUTOR or ADMIN; system admins reading via the bypass have
 * no such membership and get false.
 *
 * The status check is folded in: a non-editable status yields false even when
 * the role check passes.
 *
 * `currentUserMemberships` must be the result of including
 * `organization.memberships` on the project query, filtered by the current
 * userId and ACTIVE status. Pure synchronous logic — no DB calls.
 */
export function resolveReductionProjectEditAccess(
  status: ReductionProjectDisplayStatus,
  currentUserMemberships: { role: OrganizationRole }[]
): boolean {
  if (!isReductionProjectEditable(status)) {
    return false;
  }
  const membership = currentUserMemberships[0];
  return !!membership && REDUCTION_PROJECT_EDIT_ROLES.includes(membership.role);
}

type ReductionProjectBody = { organizationId: string };

export const reductionProjectOrganizationIdExtractor: BodyOrganizationIdExtractor<
  ReductionProjectBody
> = (request) => request.body.organizationId;

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

/**
 * Scalar fields the shared `getReductionProjectMissingFields` completeness gate
 * reads. Shared by the submit gate (`requestVerification`) and the list mapper
 * so the two projections can't drift out of sync.
 */
export const reductionProjectCompletenessSelect = {
  implementationDate: true,
  description: true,
  subcategoryId: true,
  year: true,
  baselineScenario: true,
  projectScenario: true,
  consideredGei: true,
  gwpUsed: true,
  reportedElsewhere: true,
  reportedElsewhereDescription: true,
} satisfies Prisma.ReductionProjectSelect;

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
  allowedRoles?: OrganizationRole[]
): Promise<void> {
  if (userId === null) {
    throw new ReductionProjectInvalidDataError();
  }

  const organizationWhere: Prisma.OrganizationWhereInput = {
    status: OrganizationStatus.ACTIVE,
    summary: { isAccredited: true },
  };

  if (allowedRoles) {
    organizationWhere.memberships = {
      some: {
        userId,
        status: MembershipStatus.ACTIVE,
        role: { in: allowedRoles },
      },
    };
  }

  const valid = await tx.carbonInventory.findFirst({
    where: {
      id: BigInt(carbonInventoryId),
      status: InventoryStatus.ACTIVE,
      organizationId: BigInt(organizationId),
      organization: organizationWhere,
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
