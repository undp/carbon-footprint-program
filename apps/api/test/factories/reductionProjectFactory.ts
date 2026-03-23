import type {
  PrismaClient,
  ReductionProject,
  ReductionProjectFile,
  ReductionProjectReport,
} from "@repo/database";
import { ReductionProjectStatus, ReductionProjectFileType } from "@repo/database";

export async function createTestReductionProject(
  prisma: PrismaClient,
  organizationId: bigint,
  overrides?: Partial<ReductionProject>
): Promise<ReductionProject> {
  return await prisma.reductionProject.create({
    data: {
      organizationId,
      name: "Test Reduction Project",
      status: ReductionProjectStatus.DRAFT,
      selectedGases: [],
      reportedInOtherInitiative: false,
      usePcgNationalInventory: false,
      updatedAt: null,
      ...overrides,
    },
  });
}

export async function createTestReductionProjectReport(
  prisma: PrismaClient,
  reductionProjectId: bigint,
  overrides?: Partial<ReductionProjectReport>
): Promise<ReductionProjectReport> {
  return await prisma.reductionProjectReport.create({
    data: {
      reductionProjectId,
      reductionYear: 2024,
      baselineValue: 10000,
      projectValue: 7000,
      reductionValue: 3000,
      updatedAt: null,
      ...overrides,
    },
  });
}

export async function createTestReductionProjectFile(
  prisma: PrismaClient,
  reductionProjectId: bigint,
  fileType: ReductionProjectFileType = ReductionProjectFileType.REDUCTION_REPORT,
  overrides?: Partial<ReductionProjectFile>
): Promise<ReductionProjectFile> {
  return await prisma.reductionProjectFile.create({
    data: {
      reductionProjectId,
      fileType,
      fileName: "test-file.pdf",
      fileUrl: "",
      updatedAt: null,
      ...overrides,
    },
  });
}

/**
 * Creates a reduction project ready to submit (has required fields, 1 report, 3 files)
 */
export async function createSubmittableReductionProject(
  prisma: PrismaClient,
  organizationId: bigint,
  subcategoryId: bigint
): Promise<ReductionProject> {
  const project = await createTestReductionProject(prisma, organizationId, {
    name: "Submittable Project",
    implementationDate: new Date("2024-01-01"),
    subcategoryId,
    selectedGases: ["CO2"],
    reportedInOtherInitiative: false,
    status: ReductionProjectStatus.DRAFT,
  });

  await createTestReductionProjectReport(prisma, project.id);
  await createTestReductionProjectFile(
    prisma,
    project.id,
    ReductionProjectFileType.REDUCTION_REPORT
  );
  await createTestReductionProjectFile(
    prisma,
    project.id,
    ReductionProjectFileType.VERIFICATION_REPORT
  );
  await createTestReductionProjectFile(
    prisma,
    project.id,
    ReductionProjectFileType.SELF_DECLARATION
  );

  return project;
}

export async function cleanupTestReductionProjects(
  prisma: PrismaClient
): Promise<void> {
  await prisma.submission.deleteMany();
  await prisma.submissionSubjectReductionProject.deleteMany();
  await prisma.submissionSubject.deleteMany();
  await prisma.reductionProjectFile.deleteMany();
  await prisma.reductionProjectReport.deleteMany();
  await prisma.reductionProject.deleteMany();
}
