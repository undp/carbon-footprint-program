import { Organization, OrganizationStatus, PrismaClient } from "@repo/database";

export async function createTestOrganization(
  prisma: PrismaClient,
  overrides?: Partial<Organization>
): Promise<Organization> {
  const country = await prisma.country.findFirst();
  if (!country) {
    throw new Error("No country found");
  }
  return await prisma.organization.create({
    data: {
      countryId: country.id,
      status: OrganizationStatus.NOT_ACCREDITED,
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
