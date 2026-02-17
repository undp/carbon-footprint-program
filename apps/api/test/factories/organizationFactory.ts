import { Organization, OrganizationStatus, PrismaClient } from "@repo/database";
import { getTestCountryId } from "./methodologyFactory.js";

export async function createTestOrganization(
  prisma: PrismaClient,
  overrides?: Partial<Organization>
): Promise<Organization> {
  const countryId = await getTestCountryId(prisma);

  return await prisma.organization.create({
    data: {
      countryId,
      status: OrganizationStatus.ACTIVE,
      updatedAt: null,
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
