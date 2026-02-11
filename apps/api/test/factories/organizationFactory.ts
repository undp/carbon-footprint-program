import { Organization, PrismaClient } from "@repo/database";

export async function createTestOrganization(
  prisma: PrismaClient,
  overrides?: Partial<Organization>
): Promise<Organization> {
  return await prisma.organization.create({
    data: {
      countryId: overrides?.countryId ?? 1,
      status: overrides?.status ?? "NOT_ACCREDITED",
      createdById: overrides?.createdById,
      updatedById: overrides?.updatedById,
      ...overrides,
    },
  });
}

export async function cleanupTestOrganization(
  prisma: PrismaClient
): Promise<void> {
  await prisma.submission.deleteMany();
  await prisma.submissionSubjectOrganizationData.deleteMany();
  await prisma.submissionSubject.deleteMany();
  await prisma.organizationData.deleteMany();
  await prisma.organization.deleteMany();
}
