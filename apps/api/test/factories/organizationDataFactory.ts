import {
  OrganizationData,
  OrganizationDataStatus,
  PrismaClient,
} from "@repo/database";
import { randomUUID } from "crypto";

export async function createTestOrganizationData(
  prisma: PrismaClient,
  organizationId: bigint,
  overrides?: Partial<OrganizationData>
): Promise<OrganizationData> {
  return await prisma.organizationData.create({
    data: {
      organizationId,
      legalName: `TEST_${randomUUID()}`,
      tradeName: `TEST_${randomUUID()}`,
      taxId: `TEST_${randomUUID()}`,
      countryOrganizationSizeId: null,
      representativeFullName: `TEST_${randomUUID()}`,
      representativeTaxId: `TEST_${randomUUID()}`,
      representativeCountryJobPositionId: 1,
      representativePhone: `+1234567890`,
      representativeEmail: `test@test.com`,
      status: OrganizationDataStatus.COMPLETED,
      ...overrides,
    },
  });
}

export async function cleanupTestOrganizationData(
  prisma: PrismaClient
): Promise<void> {
  await prisma.organizationData.deleteMany();
}
