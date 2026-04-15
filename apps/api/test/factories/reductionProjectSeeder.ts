import {
  type PrismaClient,
  Prisma,
  type Organization,
  type CarbonInventory,
  type UserOrganizationMembership,
  type ReductionProject,
  type Submission,
  type SubmissionSubject,
  OrganizationStatus,
  MembershipStatus,
  SubmissionStatus,
  SubmissionType,
  OrganizationDataStatus,
} from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import type { CreateReductionProjectRequest } from "@repo/types";
import { InventoryStatus, ReductionProjectStatus } from "@repo/types";
import { createTestOrganization } from "./organizationFactory.js";
import { createTestOrganizationData } from "./organizationDataFactory.js";
import { createTestMembership } from "./membershipFactory.js";
import { createCarbonInventory } from "./carbonInventorySeeder.js";
import {
  createTestOrganizationDataSubmission,
  createTestCarbonInventorySubmission,
} from "./submissionFactory.js";

export interface ReductionProjectPrerequisites {
  organization: Organization;
  carbonInventory: CarbonInventory;
  subcategory: { id: bigint };
  membership: UserOrganizationMembership;
}

/**
 * Sets up the complete prerequisite chain for reduction project tests:
 * 1. ACTIVE organization
 * 2. Organization data with APPROVED accreditation (isAccredited=true)
 * 3. User membership with specified role
 * 4. Carbon inventory linked to organization
 * 5. APPROVED CARBON_INVENTORY_VERIFICATION submission for CI
 * 6. Valid subcategory from published methodology
 */
export async function setupReductionProjectPrerequisites(
  prisma: PrismaClient,
  userId: bigint,
  role: OrganizationRole = OrganizationRole.CONTRIBUTOR
): Promise<ReductionProjectPrerequisites> {
  // 1. Create ACTIVE organization
  const organization = await createTestOrganization(prisma, {
    status: OrganizationStatus.ACTIVE,
  });

  // 2. Create organization data with APPROVED accreditation
  const orgData = await createTestOrganizationData(prisma, organization.id, {
    status: OrganizationDataStatus.ACTIVE,
  });
  await createTestOrganizationDataSubmission(
    prisma,
    orgData.id,
    SubmissionStatus.APPROVED,
    userId
  );

  // 3. Create membership with specified role
  const membership = await createTestMembership(
    prisma,
    userId,
    organization.id,
    {
      role,
      status: MembershipStatus.ACTIVE,
    }
  );

  // 4. Create carbon inventory linked to organization
  const carbonInventory = await createCarbonInventory(prisma, {
    organizationId: organization.id,
    usageMode: "SIMPLIFIED",
    status: InventoryStatus.ACTIVE,
  });

  // 5. Create APPROVED verification submission for carbon inventory
  await createTestCarbonInventorySubmission(
    prisma,
    carbonInventory.id,
    SubmissionType.CARBON_INVENTORY_VERIFICATION,
    SubmissionStatus.APPROVED,
    userId
  );

  // 6. Get valid subcategory from published methodology
  const subcategory = await prisma.subcategory.findFirst({
    where: {
      category: {
        methodologyVersion: {
          status: "PUBLISHED",
        },
      },
    },
    select: { id: true },
  });

  if (!subcategory) {
    throw new Error("No subcategory found in published methodology for tests");
  }

  return { organization, carbonInventory, subcategory, membership };
}

/**
 * Builds a valid reduction project request payload
 */
export function buildReductionProjectPayload(
  organizationId: string,
  carbonInventoryId: string,
  subcategoryId: string,
  fileUuids: string[],
  overrides?: Partial<CreateReductionProjectRequest>
): CreateReductionProjectRequest {
  return {
    name: "Test Reduction Project",
    organizationId,
    carbonInventoryId,
    implementationDate: "2024-01-15",
    description: "Test description for reduction project",
    subcategoryId,
    gwpUsed: null,
    consideredGei: ["CO2"],
    reportedElsewhere: false,
    reportedElsewhereDescription: null,
    year: 2024,
    baselineScenario: 1000,
    projectScenario: 800,
    fileUuids,
    ...overrides,
  };
}

/**
 * Creates a reduction project directly in the database (bypassing API)
 */
export async function createTestReductionProject(
  prisma: PrismaClient,
  data: {
    organizationId: bigint;
    carbonInventoryId: bigint;
    subcategoryId: bigint;
    createdById: bigint;
  },
  overrides?: Partial<Prisma.ReductionProjectUncheckedCreateInput>
): Promise<ReductionProject> {
  return prisma.reductionProject.create({
    data: {
      name: "Test Reduction Project",
      organizationId: data.organizationId,
      carbonInventoryId: data.carbonInventoryId,
      subcategoryId: data.subcategoryId,
      implementationDate: "2024-01-15",
      description: "Test description",
      gwpUsed: null,
      consideredGei: ["CO2"],
      reportedElsewhere: false,
      reportedElsewhereDescription: null,
      year: 2024,
      baselineScenario: new Prisma.Decimal("1000.00"),
      projectScenario: new Prisma.Decimal("800.00"),
      status: ReductionProjectStatus.ACTIVE,
      createdById: data.createdById,
      updatedAt: null,
      ...overrides,
    },
  });
}

/**
 * Creates a submission subject and submission for a reduction project
 */
export async function createTestReductionProjectSubmission(
  prisma: PrismaClient,
  reductionProjectId: bigint,
  status: SubmissionStatus,
  userId: bigint
): Promise<{ subject: SubmissionSubject; submission: Submission }> {
  // Check if subject already exists
  const existingSubject =
    await prisma.submissionSubjectReductionProject.findUnique({
      where: { reductionProjectId },
      include: { subject: true },
    });

  if (existingSubject) {
    // Create new submission on existing subject
    const submission = await prisma.submission.create({
      data: {
        subjectId: existingSubject.subjectId,
        type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
        status,
        createdById: userId,
        updatedAt: null,
      },
    });
    return { subject: existingSubject.subject, submission };
  }

  // Create new subject and submission
  const subject = await prisma.submissionSubject.create({
    data: {
      createdById: userId,
      submissions: {
        create: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          status,
          createdById: userId,
          updatedAt: null,
        },
      },
      reductionProject: {
        create: {
          reductionProjectId,
        },
      },
    },
    include: {
      submissions: true,
    },
  });

  return { subject, submission: subject.submissions[0] };
}

/**
 * Cleans up all reduction project test data respecting FK constraints
 */
export async function cleanupReductionProjectTestData(
  prisma: PrismaClient
): Promise<void> {
  // 1. Delete submission files first
  await prisma.submissionFile.deleteMany();

  // 2. Delete submissions
  await prisma.submission.deleteMany();

  // 3. Delete submission subject joins
  await prisma.submissionSubjectReductionProject.deleteMany();
  await prisma.submissionSubjectCarbonInventory.deleteMany();
  await prisma.submissionSubjectOrganizationData.deleteMany();

  // 4. Delete submission subjects
  await prisma.submissionSubject.deleteMany();

  // 5. Delete reduction projects
  await prisma.reductionProject.deleteMany();

  // 6. Delete carbon inventory related
  await prisma.carbonInventoryLineResult.deleteMany();
  await prisma.carbonInventoryLineFactor.deleteMany();
  await prisma.carbonInventoryLineInput.deleteMany();
  await prisma.carbonInventoryLine.deleteMany();
  await prisma.carbonInventory.deleteMany();

  // 7. Delete organization data
  await prisma.organizationData.deleteMany();

  // 8. Delete memberships
  await prisma.userOrganizationMembership.deleteMany();

  // 9. Delete organizations
  await prisma.organization.deleteMany();

  // 10. Delete files
  await prisma.file.deleteMany();
}
